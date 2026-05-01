import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Layout, Typography, Button, Card, Row, Col, Spin, Tag, Space, Badge, Tooltip,
} from 'antd';
import {
    HomeOutlined, CalendarOutlined, LoginOutlined, FlagOutlined,
    TeamOutlined, EnvironmentOutlined, ReloadOutlined, ClockCircleOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import api from '../api/client';

const { Content } = Layout;
const { Title, Text } = Typography;

const REFRESH_INTERVAL = 5 * 60; // secondes

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
                                background: '#1677ff', opacity: 0.85,
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
                                background: isMission ? '#f9f0ff' : '#e6f4ff',
                                borderLeft: `3px solid ${isMission ? '#722ed1' : '#1677ff'}`,
                                borderRadius: 4, padding: '2px 8px',
                                overflow: 'hidden', boxSizing: 'border-box',
                            }}>
                                <Text style={{
                                    fontSize: 12, fontWeight: 600,
                                    color: isMission ? '#531dab' : '#0958d9',
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

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/public/day-planning');
            setRooms(res.data?.rooms      || []);
            setMeetings(res.data?.meetings || []);
            setMissions(res.data?.missions || []);
            setDate(res.data?.date         || null);
            setCountdown(REFRESH_INTERVAL);
        } catch {
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
    }, []); // eslint-disable-line

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

    // Statistiques rapides
    const totalBookings  = meetings.length;
    const occupiedRooms  = rooms.filter((r) => r.bookings?.length > 0).length;

    // Événements pour la timeline
    const dateStr = date ? new Date(date).toISOString().split('T')[0] : '';
    const calendarEvents = [];
    meetings.forEach((m) => {
        const start = m.startTime || '';
        const end = m.endTime || '';
        calendarEvents.push({
            id:        `meeting-${m.id}`,
            type:      'meeting',
            title:     m.title || 'Réunion',
            start,
            end,
            startSort: start ? new Date(start).getTime() : 0,
            subtitle:  m.room?.location
                ? `${m.room?.name || 'Salle'} — ${m.room.location}`
                : (m.room?.name || ''),
        });
    });
    missions.forEach((m) => {
        calendarEvents.push({
            id:        `mission-${m.id}`,
            type:      'mission',
            title:     m.title,
            start:     m.startTime,
            end:       m.endTime,
            startSort: m.startTime ? new Date(m.startTime).getTime() : 0,
            subtitle:  m.location || '',
        });
    });
    calendarEvents.sort((a, b) => (a.startSort || 0) - (b.startSort || 0));

    const tabs = [
        { key: 'rooms',    label: 'Salles',     icon: <HomeOutlined />     },
        { key: 'missions', label: 'Missions',   icon: <FlagOutlined />     },
        { key: 'timeline', label: 'Calendrier', icon: <CalendarOutlined /> },
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #1a3a5c 0%, #0d1f33 100%)' }}>
            <Content style={{ padding: 'clamp(16px, 4vw, 32px) clamp(12px, 3vw, 24px)' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                    {/* ── Hero ── */}
                    <div style={{
                        display: 'flex', alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: 20, gap: 16, flexWrap: 'wrap',
                    }}>
                        <div>
                            <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
                                📅 ADM GP
                            </Title>
                            {displayDate && (
                                <Text style={{
                                    color: 'rgba(255,255,255,0.7)', fontSize: 14,
                                    display: 'block', marginTop: 4,
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

                    {/* ── Cartes statistiques ── */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[
                            {
                                label: 'Salles',
                                value: rooms.length,
                                sub:   `${occupiedRooms} occupée(s)`,
                                icon:  <HomeOutlined />,
                                color: '#1677ff',
                            },
                            {
                                label: 'Réunions',
                                value: totalBookings,
                                sub:   "aujourd'hui",
                                icon:  <TeamOutlined />,
                                color: '#52c41a',
                            },
                            {
                                label: 'Missions',
                                value: missions.length,
                                sub:   'en cours',
                                icon:  <FlagOutlined />,
                                color: '#722ed1',
                            },
                        ].map((s) => (
                            <Col key={s.label} xs={8}>
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
                                            ? '3px solid #1677ff'
                                            : '3px solid transparent',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        color: activeTab === t.key ? '#1677ff' : '#595959',
                                        fontWeight: activeTab === t.key ? 600 : 400,
                                        fontSize: 14,
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        whiteSpace: 'nowrap',
                                        transition: 'color 0.15s',
                                    }}
                                >
                                    {t.icon} {t.label}
                                    {t.key === 'rooms'    && <Tag style={{ marginLeft: 4, fontSize: 11 }}>{rooms.length}</Tag>}
                                    {t.key === 'missions' && missions.length > 0 && (
                                        <Badge count={missions.length} size="small" style={{ backgroundColor: '#722ed1' }} />
                                    )}
                                </button>
                            ))}
                        </div>

                        <Spin spinning={loading}>
                            <div style={{ padding: 20 }}>

                                {/* ── ONGLET SALLES ── */}
                                {activeTab === 'rooms' && (
                                    <>
                                        {rooms.length === 0 ? (
                                            <Text type="secondary">Aucune salle disponible.</Text>
                                        ) : (
                                            <Row gutter={[16, 16]}>
                                                {rooms.map((room) => {
                                                    const hasBookings = room.bookings?.length > 0;

                                                    // Vérifier si une réunion est en cours maintenant
                                                    const isCurrentlyBooked = room.bookings?.some((b) => {
                                                        const nowMs  = Date.now();
                                                        const startMs = dateStr && b.startTime
                                                            ? new Date(`${dateStr}T${b.startTime}`).getTime() : 0;
                                                        const endMs   = dateStr && b.endTime
                                                            ? new Date(`${dateStr}T${b.endTime}`).getTime() : 0;
                                                        return nowMs >= startMs && nowMs <= endMs;
                                                    });

                                                    return (
                                                        <Col key={room.id} xs={24} md={12} xl={8}>
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
                                                                        <HomeOutlined style={{ color: '#1677ff' }} />
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

                                                                {/* Barre d'occupation */}
                                                                <OccupancyBar bookings={room.bookings || []} />

                                                                {/* Détail des créneaux */}
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
                                    </>
                                )}

                                {/* ── ONGLET MISSIONS ── */}
                                {activeTab === 'missions' && (
                                    <>
                                        {missions.length === 0 ? (
                                            <Text type="secondary">Aucune mission prévue aujourd&apos;hui.</Text>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {missions.map((m) => (
                                                    <div
                                                        key={m.id}
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
                                    </>
                                )}

                                {/* ── ONGLET CALENDRIER (timeline) ── */}
                                {activeTab === 'timeline' && (
                                    <>
                                        <div style={{ marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#e6f4ff', border: '2px solid #1677ff' }} />
                                                <Text type="secondary" style={{ fontSize: 11 }}>Réunion</Text>
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#f9f0ff', border: '2px solid #722ed1' }} />
                                                <Text type="secondary" style={{ fontSize: 11 }}>Mission</Text>
                                            </span>
                                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
                                                {calendarEvents.length} événement(s)
                                            </Text>
                                        </div>
                                        {calendarEvents.length === 0 ? (
                                            <Text type="secondary">Aucun événement prévu aujourd&apos;hui.</Text>
                                        ) : (
                                            <DayTimeline events={calendarEvents} />
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
