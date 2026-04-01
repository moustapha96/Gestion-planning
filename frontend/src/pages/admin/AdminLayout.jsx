import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
    Breadcrumb, Card, Col, Grid, Menu, Row, Space, Tag, Typography, Select,
} from 'antd';
import { HomeOutlined, SettingOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdmin } from '../../utils/roles';
import { ROLE_COLORS, ROLE_LABELS } from './AdminSections';
import { getAdminNavForRole, getAdminPageTitle } from './adminNavConfig';
import { useState } from 'react';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function AdminLayout() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const screens = useBreakpoint();
    const compact = !screens.md;
    const [hideAdminMenu, setHideAdminMenu] = useState(false);

    const superAdmin = isSuperAdmin(user?.role);
    const navList = useMemo(() => getAdminNavForRole(superAdmin), [superAdmin]);

    const menuItems = useMemo(
        () =>
            navList.map((item) => ({
                key: item.path,
                icon: <item.icon style={{ fontSize: 16 }} />,
                label: item.label,
            })),
        [navList],
    );

    const pageTitle = getAdminPageTitle(location.pathname);

    const mobileSelect = (
        <Select
            style={{ width: '100%', marginBottom: 12 }}
            value={location.pathname}
            onChange={(path) => navigate(path)}
            options={navList.map((i) => ({ value: i.path, label: i.label }))}
            showSearch
            optionFilterProp="label"
        />
    );

    return (
        <div
            style={{
                maxWidth: 1320,
                margin: '0 auto',
                padding: '0 4px 32px',
            }}
        >
            <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                    {
                        title: (
                            <Link to="/dashboard">
                                <HomeOutlined /> Accueil
                            </Link>
                        ),
                    },
                    {
                        title: <Link to="/admin/stats">Administration</Link>,
                    },
                    { title: pageTitle },
                ]}
            />

            <div
                style={{
                    background: 'linear-gradient(135deg, #1a365d 0%, #234e7c 42%, #2b6cb0 100%)',
                    borderRadius: 12,
                    padding: compact ? '18px 20px' : '22px 28px',
                    marginBottom: 20,
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(26, 54, 93, 0.22)',
                }}
            >
                <Row gutter={[16, 12]} align="middle" justify="space-between">
                    <Col xs={24} lg={superAdmin ? 16 : 24}>
                        <Space align="center" wrap size={12}>
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 10,
                                    background: 'rgba(255,255,255,0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <SettingOutlined style={{ fontSize: 26, color: '#fff' }} />
                            </div>
                            <div>
                                <Title level={compact ? 4 : 3} style={{ margin: 0, color: '#fff', fontWeight: 600 }}>
                                    {pageTitle}
                                </Title>
                                <Text
                                    style={{
                                        color: 'rgba(255,255,255,0.88)',
                                        fontSize: compact ? 13 : 14,
                                        display: 'block',
                                        marginTop: 4,
                                    }}
                                >
                                    Administration de la plateforme — paramètres, utilisateurs et outils.
                                </Text>
                            </div>
                        </Space>
                    </Col>
                    {user?.role && (
                        <Col xs={24} lg={superAdmin ? 8 : 24} style={{ textAlign: compact ? 'left' : 'right' }}>
                            <Space wrap size={[8, 8]} style={{ justifyContent: compact ? 'flex-start' : 'flex-end', width: '100%' }}>
                                <Tag color={ROLE_COLORS[user.role]} style={{ margin: 0, padding: '4px 10px', fontSize: 13 }}>
                                    {ROLE_LABELS[user.role] || user.role}
                                </Tag>
                                {superAdmin && (
                                    <Tag
                                        color="gold"
                                        style={{ margin: 0, padding: '4px 10px', fontSize: 13, border: '1px solid rgba(255,215,0,0.45)' }}
                                    >
                                        Super admin
                                    </Tag>
                                )}
                                {!compact && (
                                    <Tag
                                        role="button"
                                        onClick={() => setHideAdminMenu((v) => !v)}
                                        style={{ cursor: 'pointer', margin: 0, padding: '4px 10px', fontSize: 13 }}
                                        icon={hideAdminMenu ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                    >
                                        {hideAdminMenu ? 'Afficher menu' : 'Masquer menu'}
                                    </Tag>
                                )}
                            </Space>
                        </Col>
                    )}
                </Row>
            </div>

            <Row gutter={[16, 16]} align="start">
                {compact ? (
                    <Col span={24}>
                        {mobileSelect}
                    </Col>
                ) : !hideAdminMenu ? (
                    <Col xs={24} md={8} lg={7} xl={6}>
                        <Card
                            size="small"
                            styles={{ body: { padding: 8 } }}
                            style={{
                                borderRadius: 12,
                                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)',
                                position: 'sticky',
                                top: 16,
                            }}
                        >
                            <Menu
                                mode="inline"
                                selectedKeys={[location.pathname]}
                                items={menuItems}
                                onClick={({ key }) => navigate(key)}
                                style={{ border: 'none' }}
                            />
                        </Card>
                    </Col>
                ) : null}
                <Col xs={24} md={compact || hideAdminMenu ? 24 : 16} lg={compact || hideAdminMenu ? 24 : 17} xl={compact || hideAdminMenu ? 24 : 18}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: 12,
                            minHeight: 360,
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)',
                        }}
                        styles={{
                            body: {
                                padding: compact ? 14 : 20,
                            },
                        }}
                    >
                        <Outlet />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
