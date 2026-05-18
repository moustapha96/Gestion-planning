import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Layout, Typography, Button, Card, Row, Col, Spin, Tag, Space, Badge, Tooltip, Segmented,
    Input, Empty,
} from 'antd';
import {
    HomeOutlined, CalendarOutlined, LoginOutlined, FlagOutlined,
    TeamOutlined, EnvironmentOutlined, ReloadOutlined, ClockCircleOutlined,
    CheckCircleOutlined, SearchOutlined, PhoneOutlined, MobileOutlined, MailOutlined,
} from '@ant-design/icons';
import api from '../api/client';

const { Content } = Layout;
const { Title, Text } = Typography;

const REFRESH_INTERVAL = 5 * 60; // secondes

// ── Normalisation pour recherche (insensible à la casse + accents) ──
function normalizeSearch(s) {
    if (s === null || s === undefined) return '';
    return String(s)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

// Découpe la requête en tokens pour matcher chaque mot indépendamment
function buildSearchTokens(q) {
    return normalizeSearch(q)
        .split(/\s+/)
        .filter(Boolean);
}

// Vérifie que TOUS les tokens sont présents dans au moins un des champs
function matchAllTokens(tokens, ...fields) {
    if (!tokens.length) return true;
    const haystack = fields.map(normalizeSearch).join(' ');
    return tokens.every((t) => haystack.includes(t));
}

// ── Helpers ──────────────────────────────────────────────────────
function formatTime(dateStr) {
    if (!dateStr) return '';
    if (typeof dateStr === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(dateStr.trim()))
        return dateStr.trim().slice(0, 5);
    try {
        return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
}

function toMinutesFromTimeStr(timeStr) {
    if (!timeStr) return null;
    const m = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
    if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
    return null;
}

// ── Barre d'occupation d'une salle (08:00 – 19:00) ──────────────
function OccupancyBar({ bookings = [] }) {
    const BAR_START = 8 * 60;
    const BAR_END   = 19 * 60;
    const TOTAL     = BAR_END - BAR_START;
    const now       = new Date();
    const nowMin    = now.getHours() * 60 + now.getMinutes();
    const nowPct    = ((nowMin - BAR_START) / TOTAL) * 100;
    const showNow   = nowPct > 0 && nowPct < 100;

    return (
        <div style={{ marginTop: 8 }}>
            {/* Barre principale */}
            <div style={{
                position: 'relative', height: 16,
                background: '#f0f0f0', borderRadius: 8, overflow: 'hidden',
            }}>
                {bookings.map((b, i) => {
                    const start = toMinutesFromTimeStr(b.startTime);
                    const end   = toMinutesFromTimeStr(b.endTime);
                    if (!start || !end) return null;
                    const left  = Math.max(0, ((start - BAR_START) / TOTAL) * 100);
                    const width = Math.min(100 - left, ((end - start) / TOTAL) * 100);
                    return (
                        <Tooltip
                            key={i}
                            title={`${b.startTime} – ${b.endTime}${b.meetingTitle ? ' : ' + b.meetingTitle : ''}`}
                        >
                            <div style={{
                                position: 'absolute',
                                left: `${left}%`, width: `${width}%`, height: '100%',
                                background: '#1565C0', opacity: 0.85,
                            }} />
                        </Tooltip>
                    );
                })}

                {/* Indicateur heure courante */}
                {showNow && (
                    <div style={{
                        position: 'absolute', left: `${nowPct}%`,
                        top: 0, bottom: 0, width: 2,
                        background: '#ff4d4f', zIndex: 2,
                    }} />
                )}
            </div>

            {/* Étiquettes horaires */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                {['08h', '11h', '14h', '17h', '19h'].map((t) => (
                    <Text key={t} type="secondary" style={{ fontSize: 9 }}>{t}</Text>
                ))}
            </div>
        </div>
    );
}

// ── Timeline journalière (vue calendrier) ────────────────────────
const TIMELINE_START = 7;
const TIMELINE_END   = 20;
const TIMELINE_HH    = 48; // px par heure
const TIMELINE_HOURS = Array.from({ length: TIMELINE_END - TIMELINE_START }, (_, i) => TIMELINE_START + i);

function parseMinTimeline(timeStr) {
    if (!timeStr) return null;
    const m = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
    if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
    try {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
    } catch { /* noop */ }
    return null;
}

function DayTimeline({ events }) {
    const now    = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowTop = ((nowMin - TIMELINE_START * 60) / 60) * TIMELINE_HH;
    const showNow = nowTop > 0 && nowTop < TIMELINE_HOURS.length * TIMELINE_HH;

    return (
        <div style={{ overflowY: 'auto', maxHeight: 480 }}>
            <div style={{ display: 'flex', minHeight: TIMELINE_HOURS.length * TIMELINE_HH }}>

                {/* Axe horaire */}
                <div style={{ width: 44, flexShrink: 0 }}>
                    {TIMELINE_HOURS.map((h) => (
                        <div key={h} style={{
                            height: TIMELINE_HH,
                            display: 'flex', alignItems: 'flex-start',
                            justifyContent: 'flex-end',
                            paddingRight: 6, paddingTop: 2,
                        }}>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                                {String(h).padStart(2, '0')}:00
                            </Text>
                        </div>
                    ))}
                </div>

                {/* Zone des événements */}
                <div style={{ flex: 1, position: 'relative', borderLeft: '2px solid #f0f0f0' }}>
                    {/* Lignes horaires */}
                    {TIMELINE_HOURS.map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute', left: 0, right: 0,
                            top: i * TIMELINE_HH, height: TIMELINE_HH,
                            borderTop: '1px solid #f5f5f5',
                        }} />
                    ))}

                    {/* Indicateur heure courante */}
                    {showNow && (
                        <div style={{
                            position: 'absolute', left: 0, right: 0,
                            top: nowTop, height: 2,
                            background: '#ff4d4f', zIndex: 3,
                        }}>
                            <div style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: '#ff4d4f',
                                position: 'absolute', left: -5, top: -3,
                            }} />
                        </div>
                    )}

                    {/* Événements */}
                    {events.map((ev) => {
                        const startMin = parseMinTimeline(ev.start);
                        const endMin   = parseMinTimeline(ev.end);
                        if (!startMin) return null;
                        const top      = ((startMin - TIMELINE_START * 60) / 60) * TIMELINE_HH;
                        const duration = endMin ? endMin - startMin : 60;
                        const height   = Math.max((duration / 60) * TIMELINE_HH, 24);
                        const isMission = ev.type === 'mission';

                        return (
                            <div key={ev.id} style={{
                                position: 'absolute',
                                left: 8, right: 8,
                                top: Math.max(0, top), height,
                                background: isMission ? '#f9f0ff' : '#e3f0ff',
                                borderLeft: `3px solid ${isMission ? '#722ed1' : '#1565C0'}`,
                                borderRadius: 4, padding: '2px 8px',
                                overflow: 'hidden', boxSizing: 'border-box',
                            }}>
                                <Text style={{
                                    fontSize: 12, fontWeight: 600,
                                    color: isMission ? '#531dab' : '#1565C0',
                                    display: 'block', whiteSpace: 'nowrap',
                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {formatTime(ev.start)} {ev.title}
                                </Text>
                                {ev.subtitle && height > 36 && (
                                    <Text type="secondary" style={{ fontSize: 11 }}>{ev.subtitle}</Text>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Page publique ────────────────────────────────────────────────
export default function Home() {
    const navigate = useNavigate();

    const [loading,   setLoading]   = useState(true);
    const [rooms,     setRooms]     = useState([]);
    const [meetings,  setMeetings]  = useState([]);
    const [missions,  setMissions]  = useState([]);
    const [date,      setDate]      = useState(null);
    const [activeTab, setActiveTab] = useState('rooms');
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
    const [horizon,   setHorizon]   = useState('day');
    const [weekPayload, setWeekPayload] = useState(null);
    const [repertoireContacts, setRepertoireContacts] = useState([]);
    const [repertoireTotal, setRepertoireTotal] = useState(0);
    const [repertoireLoading, setRepertoireLoading] = useState(false);

    // ── Recherche (debounced) ────────────────────────────────────
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch]           = useState('');

    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 200);
        return () => clearTimeout(t);
    }, [searchInput]);

    const searchTokens = useMemo(() => buildSearchTokens(search), [search]);
    const isSearching  = searchTokens.length > 0;

    // Total contacts (badge onglet) — chargé au démarrage
    useEffect(() => {
        let cancelled = false;
        api.get('/public/repertoire')
            .then((res) => {
                if (!cancelled) setRepertoireTotal((res.data || []).length);
            })
            .catch(() => {
                if (!cancelled) setRepertoireTotal(0);
            });
        return () => { cancelled = true; };
    }, []);

    // Liste filtrée lorsque l’onglet Répertoire est actif
    useEffect(() => {
        if (activeTab !== 'repertoire') return undefined;
        let cancelled = false;
        (async () => {
            setRepertoireLoading(true);
            try {
                const params = {};
                if (search) params.search = search;
                const res = await api.get('/public/repertoire', { params });
                if (!cancelled) {
                    const list = res.data || [];
                    setRepertoireContacts(list);
                    if (!search) setRepertoireTotal(list.length);
                }
            } catch {
                if (!cancelled) setRepertoireContacts([]);
            } finally {
                if (!cancelled) setRepertoireLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [activeTab, search]);

    const load = async () => {
        setLoading(true);
        try {
            if (horizon === 'day') {
                const res = await api.get('/public/day-planning');
                setWeekPayload(null);
                setRooms(res.data?.rooms      || []);
                setMeetings(res.data?.meetings || []);
                setMissions(res.data?.missions || []);
                setDate(res.data?.date         || null);
            } else {
                const res = await api.get('/public/week-planning');
                setWeekPayload(res.data || null);
                setRooms([]);
                setMeetings([]);
                setMissions([]);
                setDate(res.data?.days?.[0]?.date || null);
            }
            setCountdown(REFRESH_INTERVAL);
        } catch {
            setWeekPayload(null);
            setRooms([]);
            setMeetings([]);
            setMissions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const timer = setInterval(load, REFRESH_INTERVAL * 1000);
        return () => clearInterval(timer);
    }, [horizon]); // eslint-disable-line react-hooks/exhaustive-deps

    // Décompte visuel
    useEffect(() => {
        const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
        return () => clearInterval(tick);
    }, []);

    const displayDate = date
        ? new Date(date).toLocaleDateString('fr-FR', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })
        : '';

    const weekRangeLabel = useMemo(() => {
        if (horizon !== 'week' || !weekPayload?.days?.length) return '';
        const first = weekPayload.days[0];
        const last = weekPayload.days[weekPayload.days.length - 1];
        try {
            const a = new Date(first.date);
            const b = new Date(last.date);
            if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
                return `${a.toLocaleDateString('fr-FR', { day: 'numeric' })} – ${b.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
            }
            return `${a.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${b.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        } catch {
            return '';
        }
    }, [horizon, weekPayload]);

    const rawDayBlocks = useMemo(() => {
        if (horizon === 'week' && weekPayload?.days?.length) {
            return weekPayload.days.map((d) => ({
                key: d.dateKey,
                dateLabel: new Date(d.date).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                }),
                dateKey: d.dateKey,
                rooms: d.rooms || [],
                meetings: d.meetings || [],
                missions: d.missions || [],
            }));
        }
        const dateStr = date ? new Date(date).toISOString().split('T')[0] : '';
        if (date) {
            return [{
                key: dateStr,
                dateLabel: new Date(date).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                }),
                dateKey: dateStr,
                rooms,
                meetings,
                missions,
            }];
        }
        return [];
    }, [horizon, weekPayload, date, rooms, meetings, missions]);

    // Application du filtre de recherche sur chaque bloc journalier
    const dayBlocks = useMemo(() => {
        if (!isSearching) return rawDayBlocks;

        return rawDayBlocks.map((block) => {
            // Salles : on garde la salle si son nom/lieu OU une de ses réservations matche
            const filteredRooms = (block.rooms || [])
                .map((room) => {
                    const matchedBookings = (room.bookings || []).filter((b) =>
                        matchAllTokens(searchTokens, b.meetingTitle, b.startTime, b.endTime)
                    );
                    const roomItselfMatches = matchAllTokens(
                        searchTokens, room.name, room.location, room.capacity
                    );
                    if (roomItselfMatches) {
                        return room; // on garde toutes les réservations
                    }
                    if (matchedBookings.length) {
                        return { ...room, bookings: matchedBookings };
                    }
                    return null;
                })
                .filter(Boolean);

            const filteredMeetings = (block.meetings || []).filter((m) =>
                matchAllTokens(
                    searchTokens,
                    m.title,
                    m.room?.name,
                    m.room?.location,
                    m.eventType?.name,
                    m.createdBy?.name,
                )
            );

            const filteredMissions = (block.missions || []).filter((m) =>
                matchAllTokens(
                    searchTokens,
                    m.title,
                    m.location,
                    m.createdBy?.name,
                )
            );

            return {
                ...block,
                rooms: filteredRooms,
                meetings: filteredMeetings,
                missions: filteredMissions,
            };
        });
    }, [rawDayBlocks, isSearching, searchTokens]);

    function buildCalendarEventsForDay(meetingsList, missionsList) {
        const list = [];
        (meetingsList || []).forEach((m) => {
            const start = m.startTime || '';
            const end = m.endTime || '';
            const loc = m.room?.location
                ? `${m.room?.name || 'Salle'} — ${m.room.location}`
                : (m.room?.name || '');
            const subtitle = [m.eventType?.name, loc].filter(Boolean).join(' · ');
            list.push({
                id:        `meeting-${m.id}`,
                type:      'meeting',
                title:     m.title || 'Réunion',
                start,
                end,
                startSort: start ? new Date(start).getTime() : 0,
                subtitle,
            });
        });
        (missionsList || []).forEach((m) => {
            list.push({
                id:        `mission-${m.id}`,
                type:      'mission',
                title:     m.title,
                start:     m.startTime,
                end:       m.endTime,
                startSort: m.startTime ? new Date(m.startTime).getTime() : 0,
                subtitle:  m.location || '',
            });
        });
        list.sort((a, b) => (a.startSort || 0) - (b.startSort || 0));
        return list;
    }

    // Statistiques rapides — basées sur dayBlocks (donc filtrées si recherche active)
    const totalBookings = useMemo(
        () => dayBlocks.reduce((s, b) => s + (b.meetings?.length || 0), 0),
        [dayBlocks],
    );
    const totalMissionsStat = useMemo(
        () => dayBlocks.reduce((s, b) => s + (b.missions?.length || 0), 0),
        [dayBlocks],
    );
    const occupiedRooms = useMemo(() => {
        const ids = new Set();
        dayBlocks.forEach((b) => {
            (b.rooms || []).forEach((r) => {
                if (r.bookings?.length) ids.add(r.id);
            });
        });
        return ids.size;
    }, [dayBlocks]);

    const roomCount = useMemo(() => {
        if (!dayBlocks.length) return 0;
        if (horizon === 'week') {
            // En semaine, on compte les salles uniques agrégées
            const ids = new Set();
            dayBlocks.forEach((b) => (b.rooms || []).forEach((r) => ids.add(r.id)));
            return ids.size;
        }
        return dayBlocks[0].rooms?.length || 0;
    }, [dayBlocks, horizon]);

    const totalCalendarEvents = useMemo(
        () => dayBlocks.reduce(
            (s, b) => s + (b.meetings?.length || 0) + (b.missions?.length || 0),
            0,
        ),
        [dayBlocks],
    );

    // Total global des résultats (pour le bandeau "X résultats trouvés")
    const totalSearchResults = activeTab === 'repertoire'
        ? repertoireContacts.length
        : roomCount + totalBookings + totalMissionsStat;

    const repertoireGrouped = useMemo(() => {
        const groups = {};
        for (const c of repertoireContacts) {
            const label = c.directionLabel || '(Sans direction)';
            if (!groups[label]) groups[label] = [];
            groups[label].push(c);
        }
        return Object.entries(groups).sort(([a], [b]) =>
            a.localeCompare(b, 'fr', { sensitivity: 'base' }),
        );
    }, [repertoireContacts]);

    const searchPlaceholder = activeTab === 'repertoire'
        ? 'Rechercher un nom, une direction, un poste, un numéro…'
        : 'Rechercher une salle, une réunion, une mission, un lieu, une personne…';

    const tabs = [
        { key: 'rooms',      label: 'Salles',      icon: <HomeOutlined />     },
        { key: 'repertoire', label: 'Répertoire',  icon: <PhoneOutlined />    },
        { key: 'missions',   label: 'Missions',    icon: <FlagOutlined />     },
        { key: 'timeline',   label: 'Calendrier',  icon: <CalendarOutlined /> },
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0B2F6E 0%, #1565C0 55%, #0A2550 100%)' }}>
            <Content style={{ padding: 'clamp(16px, 4vw, 32px) clamp(12px, 3vw, 24px)' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                    {/* ── Hero ── */}
                    <div style={{
                        display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: 16, gap: 16, flexWrap: 'wrap',
                    }}>
                        <div>
                            <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
                                📅 ADM GP
                            </Title>
                            {activeTab !== 'repertoire' && (
                                <Space style={{ marginTop: 8 }} wrap>
                                    <Segmented
                                        value={horizon}
                                        onChange={setHorizon}
                                        options={[
                                            { label: 'Jour', value: 'day' },
                                            { label: 'Semaine', value: 'week' },
                                        ]}
                                    />
                                </Space>
                            )}
                            {activeTab === 'repertoire' && (
                                <Text style={{
                                    color: 'rgba(255,255,255,0.75)', fontSize: 14,
                                    display: 'block', marginTop: 8,
                                }}>
                                    <PhoneOutlined style={{ marginRight: 6 }} />
                                    Annuaire téléphonique ADM — consultation publique
                                </Text>
                            )}
                            {horizon === 'week' && weekRangeLabel && (
                                <Text style={{
                                    color: 'rgba(255,255,255,0.7)', fontSize: 14,
                                    display: 'block', marginTop: 8,
                                }}>
                                    <CalendarOutlined style={{ marginRight: 6 }} />
                                    Semaine du {weekRangeLabel}
                                </Text>
                            )}
                            {horizon === 'day' && displayDate && (
                                <Text style={{
                                    color: 'rgba(255,255,255,0.7)', fontSize: 14,
                                    display: 'block', marginTop: 8,
                                }}>
                                    <CalendarOutlined style={{ marginRight: 6 }} />
                                    {displayDate.charAt(0).toUpperCase() + displayDate.slice(1)}
                                </Text>
                            )}
                        </div>
                        <Space>
                            <Tooltip title={`Actualisation dans ${countdown}s`}>
                                <Button
                                    icon={<ReloadOutlined spin={loading} />}
                                    onClick={load}
                                    loading={loading}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        color: '#fff',
                                    }}
                                >
                                    {countdown}s
                                </Button>
                            </Tooltip>
                            <Button
                                type="primary"
                                icon={<LoginOutlined />}
                                onClick={() => navigate('/login')}
                                size="large"
                            >
                                Se connecter
                            </Button>
                        </Space>
                    </div>

                    {/* ── Barre de recherche ── */}
                    <div style={{ marginBottom: 16 }}>
                        <Input
                            allowClear
                            size="large"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.55)' }} />}
                            placeholder={searchPlaceholder}
                            style={{
                                background: 'rgba(255,255,255,0.12)',
                                border: '1px solid rgba(255,255,255,0.25)',
                                color: '#fff',
                                borderRadius: 10,
                            }}
                            styles={{
                                input: {
                                    background: 'transparent',
                                    color: '#fff',
                                },
                            }}
                        />
                        {isSearching && (
                            <Text
                                style={{
                                    display: 'block',
                                    marginTop: 6,
                                    color: 'rgba(255,255,255,0.7)',
                                    fontSize: 12,
                                }}
                            >
                                {totalSearchResults > 0
                                    ? `${totalSearchResults} résultat(s) trouvé(s) pour « ${search} »`
                                    : `Aucun résultat pour « ${search} »`}
                            </Text>
                        )}
                    </div>

                    {/* ── Cartes statistiques ── */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {(activeTab === 'repertoire'
                            ? [{
                                label: 'Contacts',
                                value: repertoireContacts.length,
                                sub: `${repertoireGrouped.length} direction(s)`,
                                icon: <PhoneOutlined />,
                                color: '#60AEFF',
                            }]
                            : [
                            {
                                label: 'Salles',
                                value: roomCount,
                                sub:   `${occupiedRooms} occupée(s)`,
                                icon:  <HomeOutlined />,
                                color: '#60AEFF',
                            },
                            {
                                label: 'Réunions',
                                value: totalBookings,
                                sub:   horizon === 'week' ? 'cette semaine' : "aujourd'hui",
                                icon:  <TeamOutlined />,
                                color: '#52c41a',
                            },
                            {
                                label: 'Missions',
                                value: totalMissionsStat,
                                sub:   horizon === 'week' ? 'cette semaine' : "aujourd'hui",
                                icon:  <FlagOutlined />,
                                color: '#722ed1',
                            },
                        ]).map((s) => (
                            <Col key={s.label} xs={activeTab === 'repertoire' ? 24 : 8}>
                                <Card
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: 12,
                                    }}
                                    styles={{ body: { padding: '12px 16px' } }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ fontSize: 22, color: s.color }}>{s.icon}</div>
                                        <div>
                                            <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                                                {s.value}
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
                                                {s.label} · {s.sub}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    {/* ── Carte principale ── */}
                    <Card style={{ borderRadius: 16, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>

                        {/* Onglets */}
                        <div style={{
                            display: 'flex', borderBottom: '1px solid #f0f0f0',
                            background: '#fafafa', overflowX: 'auto',
                        }}>
                            {tabs.map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => setActiveTab(t.key)}
                                    style={{
                                        padding: '12px 20px',
                                        border: 'none',
                                        borderBottom: activeTab === t.key
                                            ? '3px solid #1565C0'
                                            : '3px solid transparent',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        color: activeTab === t.key ? '#1565C0' : '#595959',
                                        fontWeight: activeTab === t.key ? 600 : 400,
                                        fontSize: 14,
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        whiteSpace: 'nowrap',
                                        transition: 'color 0.15s',
                                    }}
                                >
                                    {t.icon} {t.label}
                                    {t.key === 'rooms'    && <Tag style={{ marginLeft: 4, fontSize: 11 }}>{roomCount}</Tag>}
                                    {t.key === 'missions' && totalMissionsStat > 0 && (
                                        <Badge count={totalMissionsStat} size="small" style={{ backgroundColor: '#722ed1' }} />
                                    )}
                                    {t.key === 'repertoire' && repertoireTotal > 0 && (
                                        <Tag style={{ marginLeft: 4, fontSize: 11 }}>{repertoireTotal}</Tag>
                                    )}
                                </button>
                            ))}
                        </div>

                        <Spin spinning={loading || (activeTab === 'repertoire' && repertoireLoading)}>
                            <div style={{ padding: 20 }}>

                                {/* ── ONGLET SALLES ── */}
                                {activeTab === 'rooms' && (
                                    <>
                                        {dayBlocks.length === 0 || (isSearching && roomCount === 0) ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description={
                                                    isSearching
                                                        ? `Aucune salle ne correspond à « ${search} »`
                                                        : 'Aucune donnée.'
                                                }
                                            />
                                        ) : (
                                            dayBlocks.map((block) => (
                                                <div
                                                    key={block.key}
                                                    style={{ marginBottom: horizon === 'week' ? 28 : 0 }}
                                                >
                                                    {horizon === 'week' && (
                                                        <Text
                                                            strong
                                                            style={{
                                                                display: 'block',
                                                                marginBottom: 14,
                                                                fontSize: 15,
                                                                textTransform: 'capitalize',
                                                            }}
                                                        >
                                                            {block.dateLabel}
                                                        </Text>
                                                    )}
                                                    {block.rooms.length === 0 ? (
                                                        <Text type="secondary">Aucune salle disponible.</Text>
                                                    ) : (
                                                        <Row gutter={[16, 16]}>
                                                            {block.rooms.map((room) => {
                                                                const hasBookings = room.bookings?.length > 0;
                                                                const dk = block.dateKey;

                                                                const isCurrentlyBooked = room.bookings?.some((b) => {
                                                                    const nowMs = Date.now();
                                                                    const startMs = dk && b.startTime
                                                                        ? new Date(`${dk}T${b.startTime}`).getTime() : 0;
                                                                    const endMs = dk && b.endTime
                                                                        ? new Date(`${dk}T${b.endTime}`).getTime() : 0;
                                                                    return nowMs >= startMs && nowMs <= endMs;
                                                                });

                                                                return (
                                                                    <Col key={`${block.key}-${room.id}`} xs={24} md={12} xl={8}>
                                                                        <Card
                                                                            size="small"
                                                                            style={{
                                                                                borderRadius: 10,
                                                                                border: isCurrentlyBooked
                                                                                    ? '1px solid #ffa940'
                                                                                    : '1px solid #f0f0f0',
                                                                            }}
                                                                            title={
                                                                                <Space>
                                                                                    <HomeOutlined style={{ color: '#1565C0' }} />
                                                                                    <Text strong>{room.name}</Text>
                                                                                    {isCurrentlyBooked ? (
                                                                                        <Badge status="warning" text={
                                                                                            <Text style={{ fontSize: 11, color: '#fa8c16' }}>En cours</Text>
                                                                                        } />
                                                                                    ) : hasBookings ? (
                                                                                        <Badge status="processing" text={
                                                                                            <Text style={{ fontSize: 11 }}>Occupée</Text>
                                                                                        } />
                                                                                    ) : (
                                                                                        <Badge status="success" text={
                                                                                            <Text style={{ fontSize: 11, color: '#52c41a' }}>Libre</Text>
                                                                                        } />
                                                                                    )}
                                                                                </Space>
                                                                            }
                                                                        >
                                                                            {(room.location || room.capacity) && (
                                                                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                                                                                    {room.location && (
                                                                                        <><EnvironmentOutlined style={{ marginRight: 4 }} />{room.location}</>
                                                                                    )}
                                                                                    {room.capacity && (
                                                                                        <span style={{ marginLeft: 8 }}>· {room.capacity} pers.</span>
                                                                                    )}
                                                                                </Text>
                                                                            )}

                                                                            <OccupancyBar bookings={room.bookings || []} />

                                                                            {hasBookings ? (
                                                                                <div style={{ marginTop: 10 }}>
                                                                                    {room.bookings.map((b, i) => (
                                                                                        <div
                                                                                            key={i}
                                                                                            style={{
                                                                                                display: 'flex', alignItems: 'center', gap: 8,
                                                                                                padding: '4px 0',
                                                                                                borderTop: i > 0 ? '1px solid #f5f5f5' : 'none',
                                                                                            }}
                                                                                        >
                                                                                            <ClockCircleOutlined style={{ color: '#8c8c8c', fontSize: 11, flexShrink: 0 }} />
                                                                                            <Text style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                                                                {b.startTime} – {b.endTime}
                                                                                            </Text>
                                                                                            {b.meetingTitle && (
                                                                                                <Text type="secondary" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                                    {b.meetingTitle}
                                                                                                </Text>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <Text type="success" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                                                                                    <CheckCircleOutlined style={{ marginRight: 4 }} />
                                                                                    Disponible toute la journée
                                                                                </Text>
                                                                            )}
                                                                        </Card>
                                                                    </Col>
                                                                );
                                                            })}
                                                        </Row>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </>
                                )}

                                {/* ── ONGLET MISSIONS ── */}
                                {activeTab === 'missions' && (
                                    <>
                                        {dayBlocks.length === 0 || (isSearching && totalMissionsStat === 0) ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description={
                                                    isSearching
                                                        ? `Aucune mission ne correspond à « ${search} »`
                                                        : 'Aucune donnée.'
                                                }
                                            />
                                        ) : (
                                            dayBlocks.map((block) => (
                                                <div
                                                    key={block.key}
                                                    style={{ marginBottom: horizon === 'week' ? 20 : 0 }}
                                                >
                                                    {horizon === 'week' && (
                                                        <Text
                                                            strong
                                                            style={{
                                                                display: 'block',
                                                                marginBottom: 10,
                                                                fontSize: 15,
                                                                textTransform: 'capitalize',
                                                            }}
                                                        >
                                                            {block.dateLabel}
                                                        </Text>
                                                    )}
                                                    {block.missions.length === 0 ? (
                                                        <Text type="secondary">
                                                            {horizon === 'week'
                                                                ? 'Aucune mission ce jour.'
                                                                : 'Aucune mission prévue aujourd&apos;hui.'}
                                                        </Text>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                            {block.missions.map((m) => (
                                                                <div
                                                                    key={`${block.key}-${m.id}`}
                                                                    style={{
                                                                        display: 'flex', gap: 12,
                                                                        padding: '12px 16px', borderRadius: 10,
                                                                        background: '#f9f0ff',
                                                                        borderLeft: '4px solid #722ed1',
                                                                    }}
                                                                >
                                                                    <FlagOutlined style={{ color: '#722ed1', fontSize: 18, flexShrink: 0, paddingTop: 2 }} />
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <Text strong style={{ display: 'block', fontSize: 14 }}>{m.title}</Text>
                                                                        <Space size={16} style={{ marginTop: 4, flexWrap: 'wrap' }}>
                                                                            {m.location && (
                                                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                                                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                                                                                    {m.location}
                                                                                </Text>
                                                                            )}
                                                                            {(m.startTime || m.endTime) && (
                                                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                                                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                                                                                    {formatTime(m.startTime)} – {formatTime(m.endTime)}
                                                                                </Text>
                                                                            )}
                                                                            {m.createdBy?.name && (
                                                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                                                    Par {m.createdBy.name}
                                                                                </Text>
                                                                            )}
                                                                        </Space>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </>
                                )}

                                {/* ── ONGLET RÉPERTOIRE ── */}
                                {activeTab === 'repertoire' && (
                                    <>
                                        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                            {repertoireContacts.length} contact(s)
                                            {repertoireGrouped.length > 0
                                                ? ` — ${repertoireGrouped.length} direction(s).`
                                                : '.'}
                                            {' '}Filtrez par nom, direction, poste ou numéro via la recherche en haut de page.
                                        </Text>
                                        {repertoireGrouped.length === 0 ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description={
                                                    isSearching
                                                        ? `Aucun contact ne correspond à « ${search} »`
                                                        : 'Aucun contact dans le répertoire.'
                                                }
                                            />
                                        ) : (
                                            repertoireGrouped.map(([direction, members]) => (
                                                <div
                                                    key={direction}
                                                    style={{ marginBottom: 24 }}
                                                >
                                                    <Text
                                                        strong
                                                        style={{
                                                            display: 'block',
                                                            marginBottom: 12,
                                                            fontSize: 15,
                                                            color: '#1565C0',
                                                        }}
                                                    >
                                                        <PhoneOutlined style={{ marginRight: 8 }} />
                                                        {direction}
                                                    </Text>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        {members.map((c) => (
                                                            <div
                                                                key={c.id}
                                                                style={{
                                                                    padding: '12px 16px',
                                                                    borderRadius: 10,
                                                                    background: '#f0f7ff',
                                                                    borderLeft: '4px solid #1565C0',
                                                                }}
                                                            >
                                                                <Text strong style={{ display: 'block', fontSize: 14 }}>
                                                                    {c.prenomNom}
                                                                    {c.fonction && (
                                                                        <Text type="secondary" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                                                                            — {c.fonction}
                                                                        </Text>
                                                                    )}
                                                                </Text>
                                                                <Space size={16} wrap style={{ marginTop: 6 }}>
                                                                    {c.poste && (
                                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                                            Poste {c.poste}
                                                                        </Text>
                                                                    )}
                                                                    {c.directe && (
                                                                        <a href={`tel:${String(c.directe).replace(/\s/g, '')}`} style={{ fontSize: 12 }}>
                                                                            <PhoneOutlined /> {c.directe}
                                                                        </a>
                                                                    )}
                                                                    {c.portable && (
                                                                        <a href={`tel:${String(c.portable).replace(/\s/g, '')}`} style={{ fontSize: 12 }}>
                                                                            <MobileOutlined /> {c.portable}
                                                                        </a>
                                                                    )}
                                                                    {c.email && (
                                                                        <a href={`mailto:${c.email.trim()}`} style={{ fontSize: 12 }}>
                                                                            <MailOutlined /> {c.email}
                                                                        </a>
                                                                    )}
                                                                </Space>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </>
                                )}

                                {/* ── ONGLET CALENDRIER (timeline) ── */}
                                {activeTab === 'timeline' && (
                                    <>
                                        <div style={{ marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#e3f0ff', border: '2px solid #1565C0' }} />
                                                <Text type="secondary" style={{ fontSize: 11 }}>Réunion</Text>
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#f9f0ff', border: '2px solid #722ed1' }} />
                                                <Text type="secondary" style={{ fontSize: 11 }}>Mission</Text>
                                            </span>
                                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
                                                {totalCalendarEvents} événement(s)
                                            </Text>
                                        </div>
                                        {dayBlocks.length === 0 || (isSearching && totalCalendarEvents === 0) ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description={
                                                    isSearching
                                                        ? `Aucun événement ne correspond à « ${search} »`
                                                        : 'Aucune donnée.'
                                                }
                                            />
                                        ) : (
                                            dayBlocks.map((block) => {
                                                const dayEvents = buildCalendarEventsForDay(block.meetings, block.missions);
                                                return (
                                                    <div
                                                        key={block.key}
                                                        style={{ marginBottom: horizon === 'week' ? 24 : 0 }}
                                                    >
                                                        {horizon === 'week' && (
                                                            <Text
                                                                strong
                                                                style={{
                                                                    display: 'block',
                                                                    marginBottom: 10,
                                                                    fontSize: 15,
                                                                    textTransform: 'capitalize',
                                                                }}
                                                            >
                                                                {block.dateLabel}
                                                            </Text>
                                                        )}
                                                        {dayEvents.length === 0 ? (
                                                            <Text type="secondary">
                                                                {horizon === 'week'
                                                                    ? 'Aucun événement ce jour.'
                                                                    : 'Aucun événement prévu aujourd&apos;hui.'}
                                                            </Text>
                                                        ) : (
                                                            <DayTimeline events={dayEvents} />
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </>
                                )}

                            </div>
                        </Spin>
                    </Card>

                    {/* Pied de page */}
                    <Text style={{
                        color: 'rgba(255,255,255,0.3)', fontSize: 11,
                        display: 'block', textAlign: 'center', marginTop: 16,
                    }}>
                        Actualisation automatique toutes les 5 minutes · Prochain rafraîchissement dans {countdown}s
                    </Text>
                </div>
            </Content>
        </Layout>
    );
}
