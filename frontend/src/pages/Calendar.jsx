import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card, Typography, Button, Space, Spin, Tag, Segmented, Tooltip, App, Dropdown, Modal, Descriptions,
} from 'antd';
import {
    LeftOutlined, RightOutlined, CalendarOutlined,
    FileTextOutlined,
    DownloadOutlined, PrinterOutlined,
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { appDayjs, appYmd } from '../utils/datetime';
import {
    eventOverlapsDay,
    buildEventsMapForDays,
    formatTimeInAppTz,
} from '../utils/calendarEvents';

const { Title, Text } = Typography;

// ── Constantes de la grille horaire ─────────────────────────────
const START_HOUR  = 7;
const END_HOUR    = 21;
const HOUR_HEIGHT = 56; // px par heure
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

// ── Helpers ──────────────────────────────────────────────────────
function mondayFirstWeekdayIndex(jsDay) {
    return jsDay === 0 ? 6 : jsDay - 1;
}

const EVENT_STYLES = {
    meeting: { bg: '#EFF6FF', border: '#1565C0', color: '#1D4ED8', label: 'Réunion'  },
    mission: { bg: '#f9f0ff', border: '#722ed1', color: '#531dab', label: 'Mission'  },
    planning:{ bg: '#f6ffed', border: '#52c41a', color: '#389e0d', label: 'Planning' },
    default: { bg: '#fffbe6', border: '#faad14', color: '#d48806', label: 'Événement'},
};

function getEventStyle(ev) {
    if (ev.type === 'meeting') return EVENT_STYLES.meeting;
    if (ev.type === 'mission') return EVENT_STYLES.mission;
    if (ev.type === 'planning-event' || ev.type === 'planning' || ev.eventType === 'REUNION') {
        return EVENT_STYLES.planning;
    }
    return EVENT_STYLES.default;
}

function getEventLocation(ev) {
    // N'afficher que des lieux lisibles (jamais un identifiant technique)
    const raw = ev?.room || ev?.location || ev?.destination || '';
    const value = String(raw || '').trim();
    if (!value) return '';
    const looksLikeId =
        /^[a-f0-9]{24,}$/i.test(value) // hex long
        || /^c[a-z0-9]{20,}$/i.test(value) // cuid-like
        || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value); // uuid-like
    return looksLikeId ? '' : value;
}

function parseMinutes(timeStr) {
    if (!timeStr) return null;
    const d = appDayjs(timeStr);
    if (d.isValid()) return d.hour() * 60 + d.minute();
    const m = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    return null;
}

const formatTime = formatTimeInAppTz;

// ── Événement positionné dans la grille ─────────────────────────
function GridEvent({ ev, onNavigate }) {
    const style   = getEventStyle(ev);
    const startMin = parseMinutes(ev.startTime || ev.time);
    if (startMin === null) return null;

    const endMin   = parseMinutes(ev.endTime) || (startMin + 60);
    const top      = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height   = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);
    const startStr = formatTime(ev.startTime || ev.time);
    const endStr   = formatTime(ev.endTime);

    const location = getEventLocation(ev);
    return (
        <Tooltip title={`${startStr}${endStr ? ` – ${endStr}` : ''} · ${ev.title}${location ? ` · ${location}` : ''}`}>
            <div
                onClick={(e) => { e.stopPropagation(); onNavigate(ev); }}
                style={{
                    position: 'absolute',
                    left: 2, right: 2,
                    top: Math.max(0, top),
                    height,
                    background: style.bg,
                    borderLeft: `3px solid ${style.border}`,
                    borderRadius: 4,
                    padding: '2px 5px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    zIndex: 2,
                    boxSizing: 'border-box',
                    transition: 'opacity 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
                <Text style={{
                    fontSize: 11, color: style.color, fontWeight: 600,
                    display: 'block', lineHeight: 1.3,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {startStr} {ev.title}
                </Text>
            </div>
        </Tooltip>
    );
}

// ── Grille horaire (semaine + jour) ──────────────────────────────
function TimeGrid({ containerRef, columns, eventsMap, nowLine, onNavigate }) {
    return (
        <div
            ref={containerRef}
            style={{ overflowY: 'auto', maxHeight: 580, overflowX: 'auto' }}
        >
            <div style={{ display: 'flex', minWidth: columns.length > 3 ? 560 : undefined }}>

                {/* Axe horaire */}
                <div style={{ width: 48, flexShrink: 0, paddingTop: 38 }}>
                    {HOURS.map((h) => (
                        <div key={h} style={{
                            height: HOUR_HEIGHT,
                            display: 'flex', alignItems: 'flex-start',
                            justifyContent: 'flex-end',
                            paddingRight: 8, paddingTop: 2,
                        }}>
                            <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                                {String(h).padStart(2, '0')}:00
                            </Text>
                        </div>
                    ))}
                </div>

                {/* Colonnes par jour */}
                <div style={{ display: 'flex', flex: 1 }}>
                    {columns.map(({ key, header, todayFlag }) => {
                        const colEvents = eventsMap[key] || [];
                        return (
                            <div key={key} style={{ flex: 1, minWidth: 80, borderLeft: '1px solid #f0f0f0' }}>

                                {/* En-tête collant */}
                                <div style={{
                                    position: 'sticky', top: 0, zIndex: 5,
                                    background: todayFlag ? '#EFF6FF' : '#fafafa',
                                    borderBottom: `2px solid ${todayFlag ? '#1565C0' : '#f0f0f0'}`,
                                    padding: '6px 4px', textAlign: 'center', minHeight: 38,
                                }}>
                                    <Text strong={todayFlag} style={{
                                        fontSize: 11,
                                        color: todayFlag ? '#1565C0' : '#595959',
                                        display: 'block',
                                    }}>
                                        {header}
                                    </Text>
                                    {todayFlag && (
                                        <div style={{
                                            display: 'inline-block',
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: '#1565C0', marginTop: 2,
                                        }} />
                                    )}
                                </div>

                                {/* Grille + événements */}
                                <div style={{ position: 'relative', height: HOURS.length * HOUR_HEIGHT }}>
                                    {HOURS.map((h, i) => (
                                        <div key={h} style={{
                                            position: 'absolute', left: 0, right: 0,
                                            top: i * HOUR_HEIGHT, height: HOUR_HEIGHT,
                                            borderTop: '1px solid #f5f5f5',
                                        }} />
                                    ))}

                                    {/* Indicateur heure courante */}
                                    {todayFlag && nowLine >= 0 && nowLine <= HOURS.length * HOUR_HEIGHT && (
                                        <div style={{
                                            position: 'absolute', left: 0, right: 0,
                                            top: nowLine - 1, height: 2,
                                            background: '#ff4d4f', zIndex: 4,
                                            boxShadow: '0 0 4px rgba(255,77,79,0.4)',
                                        }}>
                                            <div style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                background: '#ff4d4f',
                                                position: 'absolute', left: -4, top: -3,
                                            }} />
                                        </div>
                                    )}

                                    {colEvents.map((ev) => (
                                        <GridEvent key={`${ev.type || 'ev'}-${ev.id}-${key}`} ev={ev} onNavigate={onNavigate} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Export helpers ────────────────────────────────────────────────

// Dérive la date YYYY-MM-DD depuis un ISO string si ev.date est absent
function evDate(ev) {
    if (ev.date) return ev.date;
    const raw = ev.startTime || ev.time;
    if (raw) return appYmd(raw);
    return '';
}

function icsDate(dateStr, timeStr) {
    // timeStr est un ISO string complet → conversion directe
    if (timeStr) {
        try {
            const d = new Date(timeStr);
            if (!isNaN(d.getTime()))
                return d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
        } catch { /* noop */ }
    }
    // Fallback sur dateStr seule
    const safe = String(dateStr || '').replace(/-/g, '');
    if (safe.length >= 8) return safe.slice(0, 8) + 'T000000';
    return '19700101T000000';
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    // Laisser le temps au navigateur de traiter le clic avant de révoquer l'URL
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
}

function safeLabel(label) {
    return String(label || 'calendrier').replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 80);
}

/** Échappement RFC 5545 pour champs texte (SUMMARY, DESCRIPTION, LOCATION) */
function escapeICSField(text) {
    return String(text || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

function defaultEventEndICS(ev, dtStart) {
    if (ev.endTime) return icsDate(ev.date, ev.endTime);
    try {
        const raw = ev.startTime || ev.time;
        if (raw) {
            const d = new Date(raw);
            if (!isNaN(d.getTime())) {
                const end = new Date(d.getTime() + 60 * 60 * 1000);
                return end.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
            }
        }
    } catch { /* noop */ }
    const ds = String(dtStart);
    const day = ds.length >= 8 ? ds.slice(0, 8) : String(evDate(ev)).replace(/-/g, '');
    return `${day}T235959`;
}

function exportICS(events, label) {
    const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0',
        'PRODID:-//ADM GP//App//FR',
        `X-WR-CALNAME:${escapeICSField(label)}`,
        'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ];
    for (const ev of events) {
        const dtStart = icsDate(evDate(ev), ev.startTime || ev.time);
        const dtEnd   = defaultEventEndICS(ev, dtStart);
        lines.push(
            'BEGIN:VEVENT',
            `UID:${ev.id}@gestion-planning`,
            `DTSTART:${dtStart}`,
            `DTEND:${dtEnd}`,
            `SUMMARY:${escapeICSField(ev.title)}`,
            `DESCRIPTION:${escapeICSField(`Type: ${getEventStyle(ev).label}`)}`,
            ...(getEventLocation(ev) ? [`LOCATION:${escapeICSField(getEventLocation(ev))}`] : []),
            'END:VEVENT',
        );
    }
    lines.push('END:VCALENDAR');
    triggerDownload(
        new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }),
        `calendrier-${safeLabel(label)}.ics`,
    );
}

function exportCSV(events, label) {
    const BOM  = '\uFEFF'; // BOM UTF-8 pour Excel
    const SEP  = ';';
    const rows = [
        ['Date', 'Heure début', 'Heure fin', 'Titre', 'Type', 'Salle'].join(SEP),
        ...[...events]
            .sort((a, b) => evDate(a).localeCompare(evDate(b)))
            .map((ev) => [
                evDate(ev),
                formatTime(ev.startTime || ev.time),
                formatTime(ev.endTime),
                `"${String(ev.title || '').replace(/"/g, '""')}"`,
                getEventStyle(ev).label,
                getEventLocation(ev) || '',
            ].join(SEP)),
    ];
    triggerDownload(
        new Blob([BOM + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }),
        `calendrier-${safeLabel(label)}.csv`,
    );
}

/** Format jolie de date « 8 mai 2026 » à partir d'une chaîne YYYY-MM-DD */
function prettyDate(ymd) {
    if (!ymd) return '';
    try {
        const [y, m, d] = ymd.split('-').map((s) => parseInt(s, 10));
        if (!y || !m || !d) return ymd;
        return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        });
    } catch {
        return ymd;
    }
}

/**
 * Export PDF natif (jsPDF + autotable).
 * Génère et télécharge directement un fichier .pdf — sans popup.
 */
function exportPDF(events, label) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── En-tête ──
    doc.setFillColor(21, 101, 192); // #1565C0
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CALENDRIER', 10, 11);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(String(label || ''), pageWidth - 10, 11, { align: 'right' });

    // ── Sous-titre / méta ──
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    const exportedOn = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
    doc.text(
        `Exporté le ${exportedOn} · ${events.length} événement(s)`,
        10, 24,
    );

    // ── Préparation du tableau ──
    const sorted = [...events].sort((a, b) => {
        const da = evDate(a);
        const db = evDate(b);
        if (da !== db) return da.localeCompare(db);
        const ta = String(a.startTime || a.time || '');
        const tb = String(b.startTime || b.time || '');
        return ta.localeCompare(tb);
    });

    // Groupement par date avec une ligne d'en-tête par jour
    const tableBody = [];
    let currentDate = null;
    for (const ev of sorted) {
        const d = evDate(ev);
        if (d !== currentDate) {
            tableBody.push([{
                content: prettyDate(d).toUpperCase(),
                colSpan: 5,
                styles: {
                    fillColor: [232, 240, 249],
                    textColor: [21, 101, 192],
                    fontStyle: 'bold',
                    fontSize: 9,
                    halign: 'left',
                },
            }]);
            currentDate = d;
        }
        const s = getEventStyle(ev);
        const time = `${formatTime(ev.startTime || ev.time)}${ev.endTime ? ` – ${formatTime(ev.endTime)}` : ''}`;
        tableBody.push([
            { content: time || '—', styles: { halign: 'left', fontStyle: 'bold' } },
            ev.title || '—',
            { content: s.label, styles: { halign: 'center', fontStyle: 'bold' } },
            getEventLocation(ev) || '—',
            ev.description ? String(ev.description).slice(0, 200) : '',
        ]);
    }

    autoTable(doc, {
        startY: 30,
        head: [['Horaire', 'Titre', 'Type', 'Lieu', 'Description']],
        body: tableBody.length
            ? tableBody
            : [[{
                content: 'Aucun événement à exporter pour la période affichée.',
                colSpan: 5,
                styles: { halign: 'center', textColor: [150, 150, 150], fontStyle: 'italic' },
            }]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, font: 'helvetica', valign: 'middle' },
        headStyles: {
            fillColor: [10, 39, 68],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
        },
        columnStyles: {
            0: { cellWidth: 32 },              // Horaire
            1: { cellWidth: 80 },              // Titre
            2: { cellWidth: 28, halign: 'center' }, // Type
            3: { cellWidth: 50 },              // Lieu
            4: { cellWidth: 'auto' },          // Description
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 28, left: 8, right: 8, bottom: 14 },
        didDrawPage: (data) => {
            doc.setFontSize(7);
            doc.setTextColor(120, 120, 120);
            doc.text(
                `ADM GP · Calendrier — ${label}  ·  Page ${data.pageNumber}`,
                pageWidth / 2,
                pageHeight - 6,
                { align: 'center' },
            );
            doc.setDrawColor(21, 101, 192);
            doc.setLineWidth(0.2);
            doc.line(8, pageHeight - 10, pageWidth - 8, pageHeight - 10);
        },
    });

    doc.save(`calendrier-${safeLabel(label)}.pdf`);
}

// ── Page principale ───────────────────────────────────────────────
export default function Calendar() {
    const { message } = App.useApp();
    const { user }    = useAuth();
    const navigate    = useNavigate();
    const timeGridRef = useRef(null);

    const [events,       setEvents]       = useState([]);
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [loading,      setLoading]      = useState(false);
    const [view,         setView]         = useState('month');
    const [dayEvents,    setDayEvents]    = useState([]);
    const [weekEvents,   setWeekEvents]   = useState([]);
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [nowLine,      setNowLine]      = useState(0);
    const [detailsOpen,  setDetailsOpen]  = useState(false);
    const [detailsEvent, setDetailsEvent] = useState(null);

    const month = currentMonth.getMonth() + 1;
    const year  = currentMonth.getFullYear();

    // Ligne heure courante — mise à jour chaque minute
    useEffect(() => {
        const update = () => {
            const now = new Date();
            setNowLine(((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / 60) * HOUR_HEIGHT);
        };
        update();
        const t = setInterval(update, 60_000);
        return () => clearInterval(t);
    }, []);

    // Scroll vers l'heure courante lors du changement de vue
    useEffect(() => {
        if ((view === 'week' || view === 'day') && timeGridRef.current) {
            timeGridRef.current.scrollTop = Math.max(0, nowLine - 140);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view]);

    // ── Fetches ──────────────────────────────────────────────────
    const fetchMonth = async () => {
        try {
            setLoading(true);
            const res = await api.get('/calendar/month', { params: { month, year } });
            setEvents(res.data.events || []);
        } catch { message.error('Impossible de charger le calendrier'); }
        finally  { setLoading(false); }
    };

    const fetchWeek = async (date) => {
        try {
            setLoading(true);
            const d = appYmd(date);
            const res = await api.get('/calendar/week', { params: { date: d } });
            setWeekEvents(res.data.events || []);
        } catch { message.error('Erreur chargement semaine'); }
        finally  { setLoading(false); }
    };

    const fetchDay = async (date) => {
        try {
            setLoading(true);
            const d = appYmd(date);
            const res = await api.get('/calendar/day', { params: { date: d } });
            setDayEvents(res.data.events || []);
        } catch { message.error('Erreur chargement jour'); }
        finally  { setLoading(false); }
    };

    useEffect(() => { if (view === 'month') fetchMonth(); }, [currentMonth, view]); // eslint-disable-line
    useEffect(() => { if (view === 'week')  fetchWeek(selectedDate); }, [view, selectedDate]); // eslint-disable-line
    useEffect(() => { if (view === 'day')   fetchDay(selectedDate);  }, [view, selectedDate]); // eslint-disable-line

    // ── Navigation ───────────────────────────────────────────────
    const goToToday = () => { const now = new Date(); setCurrentMonth(now); setSelectedDate(now); };

    const nav = (dir) => {
        const delta = dir === 'next' ? 1 : -1;
        if (view === 'month') {
            setCurrentMonth(new Date(year, month - 1 + delta, 1));
        } else if (view === 'week') {
            const x = new Date(selectedDate); x.setDate(x.getDate() + delta * 7); setSelectedDate(x);
        } else {
            const x = new Date(selectedDate); x.setDate(x.getDate() + delta); setSelectedDate(x);
        }
    };

    // ── Utilitaires calendrier ───────────────────────────────────
    const getDaysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const getFirstDayMon = (d) => mondayFirstWeekdayIndex(new Date(d.getFullYear(), d.getMonth(), 1).getDay());
    const getEventsForDate = (day) => {
        const ds = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter((e) => eventOverlapsDay(e, ds));
    };

    const isTodayDate = (date) => new Date().toDateString() === new Date(date).toDateString();
    const isTodayDay  = (day)  => new Date().toDateString() === new Date(year, month - 1, day).toDateString();

    const weekDays = useMemo(() => {
        const d     = new Date(selectedDate);
        const diff  = d.getDate() - mondayFirstWeekdayIndex(d.getDay());
        const monday = new Date(d); monday.setDate(diff); monday.setHours(0, 0, 0, 0);
        return Array.from({ length: 7 }, (_, i) => {
            const x = new Date(monday); x.setDate(monday.getDate() + i); return x;
        });
    }, [selectedDate]);

    const weekLabel = useMemo(() => {
        if (!weekDays.length) return '';
        const [first, last] = [weekDays[0], weekDays[6]];
        if (first.getMonth() === last.getMonth())
            return `${first.getDate()} – ${last.getDate()} ${last.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
        return `${first.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${last.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }, [weekDays]);

    const getEventLink = (ev) => {
        if (ev.planningId) return `/planning/${ev.planningId}`;
        if (ev.meetingId) return `/meetings/${ev.meetingId}`;
        if (ev.type === 'meeting' && ev.id) return `/meetings/${ev.id}`;
        if (ev.missionId) return `/missions/${ev.missionId}`;
        if (ev.type === 'mission' && ev.id) return `/missions/${ev.id}`;
        return null;
    };

    /** Date utilisée pour les liens « Nouvelle réunion / mission » (mois affiché vs jour sélectionné) */
    const createAnchorDate = useMemo(() => {
        if (view === 'month') {
            const now = new Date();
            if (now.getMonth() === currentMonth.getMonth() && now.getFullYear() === currentMonth.getFullYear()) {
                return now;
            }
            return new Date(year, month - 1, 1);
        }
        return selectedDate;
    }, [view, currentMonth, selectedDate, year, month]);

    const createDateParam = appYmd(createAnchorDate);

    const handleEventClick = (ev) => {
        setDetailsEvent(ev);
        setDetailsOpen(true);
    };

    // ── Grille mois ───────────────────────────────────────────────
    const calendarGrid = useMemo(() => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay    = getFirstDayMon(currentMonth);
        const cells       = [];

        // Cases vides avant le 1er du mois
        for (let i = 0; i < firstDay; i++) {
            cells.push(
                <div key={`empty-${i}`} style={{
                    minHeight: 96,
                    background: '#fafafa',
                    border: '1px solid #f5f5f5',
                }} />
            );
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const evs   = getEventsForDate(day);
            const today = isTodayDay(day);
            cells.push(
                <div
                    key={day}
                    onClick={() => { setSelectedDate(new Date(year, month - 1, day)); setView('day'); }}
                    style={{
                        minHeight: 96,
                        border: `1px solid ${today ? '#1565C060' : '#f0f0f0'}`,
                        padding: '4px 6px',
                        background: today ? '#EFF6FF' : '#fff',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { if (!today) e.currentTarget.style.background = '#f8f8f8'; }}
                    onMouseLeave={(e) => { if (!today) e.currentTarget.style.background = '#fff'; }}
                >
                    {/* Numéro du jour */}
                    <div style={{ marginBottom: 3 }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: '50%',
                            background: today ? '#1565C0' : 'transparent',
                            color: today ? '#fff' : '#262626',
                            fontWeight: today ? 700 : 400, fontSize: 12,
                        }}>
                            {day}
                        </span>
                    </div>

                    {/* Événements */}
                    {evs.slice(0, 3).map((ev) => {
                        const s = getEventStyle(ev);
                        const t = formatTime(ev.startTime || ev.time);
                        return (
                            <div
                                key={`${ev.type || 'ev'}-${ev.id}-${day}`}
                                onClick={(e) => { e.stopPropagation(); handleEventClick(ev); }}
                                title={ev.title}
                                style={{
                                    fontSize: 10, padding: '1px 4px', borderRadius: 2, marginBottom: 1,
                                    background: s.bg, borderLeft: `2px solid ${s.border}`,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                }}
                            >
                                {t && <span style={{ color: s.color, fontWeight: 600 }}>{t} </span>}
                                {ev.title}
                            </div>
                        );
                    })}
                    {evs.length > 3 && (
                        <Text type="secondary" style={{ fontSize: 10 }}>+{evs.length - 3} autre(s)</Text>
                    )}
                </div>
            );
        }
        return cells;
    }, [currentMonth, events, year, month]); // eslint-disable-line

    if (!user?.id) { navigate('/login'); return null; }

    const monthName    = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const daysOfWeek   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const currentLabel =
        view === 'month' ? (monthName.charAt(0).toUpperCase() + monthName.slice(1)) :
        view === 'week'  ? weekLabel :
        selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const currentEvents = view === 'month' ? events : view === 'week' ? weekEvents : dayEvents;

    const exportMenuItems = [
        {
            key: 'pdf',
            label: 'PDF — Téléchargement direct',
            icon: <PrinterOutlined />,
        },
        {
            key: 'ics',
            label: 'iCal (.ics) — Google / Outlook / Apple',
            icon: <CalendarOutlined />,
        },
        {
            key: 'csv',
            label: 'CSV — Excel / Google Sheets',
            icon: <FileTextOutlined />,
        },
    ];

    const handleExportMenuClick = ({ key }) => {
        const list = currentEvents || [];
        if (!list.length) {
            message.warning('Aucun événement à exporter pour la période affichée.');
            return;
        }
        try {
            if (key === 'ics') {
                exportICS(list, currentLabel);
                message.success('Fichier .ics téléchargé.');
            } else if (key === 'csv') {
                exportCSV(list, currentLabel);
                message.success('Fichier CSV téléchargé.');
            } else if (key === 'pdf') {
                exportPDF(list, currentLabel);
                message.success('PDF généré et téléchargé.');
            }
        } catch (err) {
            console.error('[Calendar] Export error', err);
            message.error('Export impossible. Réessayez.');
        }
    };

    const exportTooltip =
        view === 'month'
            ? 'Exporter tous les événements du mois affiché (iCal, CSV ou impression).'
            : view === 'week'
              ? 'Exporter les événements de la semaine affichée.'
              : 'Exporter les événements du jour affiché.';

    return (
        <div>
            {/* ── Barre de titre ── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12,
            }}>
                <Title level={3} style={{ margin: 0, flex: '1 1 auto', minWidth: 0 }}>
                    <CalendarOutlined /> Calendrier
                </Title>
                <Space wrap size="small" style={{ justifyContent: 'flex-end', width: '100%', maxWidth: '100%' }}>
                    <Segmented
                        value={view}
                        onChange={setView}
                        options={[
                            { label: 'Mois',    value: 'month' },
                            { label: 'Semaine', value: 'week'  },
                            { label: 'Jour',    value: 'day'   },
                        ]}
                    />
                    <Button.Group size="small">
                        <Button
                            type="primary"
                            onClick={() => navigate(`/meetings/new?date=${createDateParam}`)}
                        >
                            + Réunion
                        </Button>
                        <Button onClick={() => navigate(`/missions/new?date=${createDateParam}`)}>
                            + Mission
                        </Button>
                    </Button.Group>
                    <Button size="small" onClick={() => navigate('/events')}>
                        Liste des événements
                    </Button>
                    <Button size="small" onClick={() => navigate('/planning')}>
                        Planning hebdo
                    </Button>
                    <Tooltip title={exportTooltip}>
                        <span style={{ display: 'inline-block' }}>
                            <Dropdown
                                menu={{ items: exportMenuItems, onClick: handleExportMenuClick }}
                                trigger={['click']}
                                placement="bottomRight"
                                destroyOnHidden
                            >
                                <Button
                                    icon={<DownloadOutlined />}
                                    size="small"
                                    loading={loading}
                                    disabled={loading}
                                    aria-haspopup="menu"
                                    aria-label="Exporter le calendrier"
                                >
                                    Exporter
                                </Button>
                            </Dropdown>
                        </span>
                    </Tooltip>
                </Space>
            </div>

            {/* ── Carte principale ── */}
            <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>

                {/* Navigation */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap',
                }}>
                    <Button icon={<LeftOutlined />}  size="small" onClick={() => nav('prev')} />
                    <Button                          size="small" onClick={goToToday}>Aujourd'hui</Button>
                    <Button icon={<RightOutlined />} size="small" onClick={() => nav('next')} />
                    <Text strong style={{ fontSize: 15, marginLeft: 4 }}>{currentLabel}</Text>
                </div>

                <Spin spinning={loading}>

                    {/* ══ VUE MOIS ══ */}
                    {view === 'month' && (
                        <>
                            {/* En-têtes des jours */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                                background: '#fafafa', borderBottom: '1px solid #f0f0f0',
                            }}>
                                {daysOfWeek.map((d, i) => (
                                    <div key={d} style={{
                                        padding: '8px 0', textAlign: 'center',
                                        fontWeight: 600, fontSize: 12,
                                        color: i >= 5 ? '#ff4d4f' : '#8c8c8c',
                                    }}>
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Grille des jours */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                                {calendarGrid}
                            </div>

                            {/* Légende */}
                            <div style={{
                                display: 'flex', gap: 12, padding: '10px 16px',
                                borderTop: '1px solid #f0f0f0', flexWrap: 'wrap',
                                alignItems: 'center',
                            }}>
                                {Object.entries(EVENT_STYLES).filter(([k]) => k !== 'default').map(([, s]) => (
                                    <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{
                                            display: 'inline-block', width: 10, height: 10,
                                            borderRadius: 2, background: s.bg, border: `2px solid ${s.border}`,
                                        }} />
                                        <Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>
                                    </span>
                                ))}
                                <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto', fontStyle: 'italic' }}>
                                    Cliquer sur un jour pour le détail
                                </Text>
                            </div>
                        </>
                    )}

                    {/* ══ VUE SEMAINE ══ */}
                    {view === 'week' && (() => {
                        const dayKeys = weekDays.map((d) => appYmd(d));
                        const columns = weekDays.map((d, i) => ({
                            key:       dayKeys[i],
                            header:    d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
                            todayFlag: isTodayDate(d),
                        }));
                        const eventsMap = buildEventsMapForDays(weekEvents, dayKeys);
                        return (
                            <TimeGrid
                                containerRef={timeGridRef}
                                columns={columns}
                                eventsMap={eventsMap}
                                nowLine={nowLine}
                                onNavigate={handleEventClick}
                            />
                        );
                    })()}

                    {/* ══ VUE JOUR ══ */}
                    {view === 'day' && (() => {
                        const dateStr = appYmd(selectedDate);
                        return (
                            <TimeGrid
                                containerRef={timeGridRef}
                                columns={[{
                                    key:       dateStr,
                                    header:    selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }),
                                    todayFlag: isTodayDate(selectedDate),
                                }]}
                                eventsMap={buildEventsMapForDays(dayEvents, [dateStr])}
                                nowLine={nowLine}
                                onNavigate={handleEventClick}
                            />
                        );
                    })()}

                </Spin>
            </Card>

            {/* ── Liste des événements du mois (vue mois uniquement) ── */}
            {view === 'month' && events.length > 0 && (
                <Card
                    title={<span><FileTextOutlined style={{ marginRight: 6 }} />{currentLabel}</span>}
                    style={{ marginTop: 16, borderRadius: 12 }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[...events]
                            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                            .slice(0, 20)
                            .map((ev) => {
                                const s = getEventStyle(ev);
                                return (
                                    <div
                                        key={ev.id}
                                        onClick={() => handleEventClick(ev)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '8px 12px', borderRadius: 8,
                                            background: s.bg, borderLeft: `4px solid ${s.border}`,
                                            cursor: 'pointer',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                                    >
                                        <Text style={{ fontSize: 12, color: s.color, fontWeight: 600, width: 42, flexShrink: 0 }}>
                                            {formatTime(ev.startTime)}
                                        </Text>
                                        <Text strong style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {ev.title}
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{ev.date}</Text>
                                        <Tag style={{ fontSize: 10, margin: 0, borderColor: s.border, color: s.color, background: 'transparent' }}>
                                            {s.label}
                                        </Tag>
                                    </div>
                                );
                            })
                        }
                        {events.length > 20 && (
                            <Text type="secondary" style={{ textAlign: 'center', fontSize: 12 }}>
                                … et {events.length - 20} autre(s)
                            </Text>
                        )}
                    </div>
                </Card>
            )}

            <Modal
                title="Détails de l'événement"
                open={detailsOpen}
                onCancel={() => { setDetailsOpen(false); setDetailsEvent(null); }}
                footer={null}
                width={680}
                destroyOnClose
            >
                {detailsEvent && (
                    <>
                        <Descriptions bordered size="small" column={1}>
                            <Descriptions.Item label="Titre">{detailsEvent.title || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Type">{getEventStyle(detailsEvent).label}</Descriptions.Item>
                            <Descriptions.Item label="Date">{detailsEvent.date || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Début">{formatTime(detailsEvent.startTime || detailsEvent.time) || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Fin">{formatTime(detailsEvent.endTime) || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Lieu">
                                {getEventLocation(detailsEvent) || detailsEvent.room || detailsEvent.location || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Description">{detailsEvent.description || '-'}</Descriptions.Item>
                        </Descriptions>
                        <Space style={{ marginTop: 16 }}>
                            {getEventLink(detailsEvent) && (
                                <Button
                                    type="primary"
                                    onClick={() => {
                                        const link = getEventLink(detailsEvent);
                                        setDetailsOpen(false);
                                        if (link) navigate(link);
                                    }}
                                >
                                    Ouvrir la page
                                </Button>
                            )}
                            <Button onClick={() => { setDetailsOpen(false); setDetailsEvent(null); }}>Fermer</Button>
                        </Space>
                    </>
                )}
            </Modal>
        </div>
    );
}
