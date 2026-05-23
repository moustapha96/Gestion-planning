import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Button, Input, Space, Typography, Tag, Modal, Form,
  App, Tooltip, Divider, Select, Card, Row, Col, Statistic,
  Popconfirm, Badge, Drawer, Avatar, Alert,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  FileWordOutlined, FilePdfOutlined, PhoneOutlined, MobileOutlined,
  UserOutlined, ApartmentOutlined, ReloadOutlined, MailOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { canAccessRepertoire, canManageRepertoire } from '../utils/roles';
import { exportRepertoirePdf, downloadRepertoireDocx } from '../utils/repertoireExport';

const { Title, Text } = Typography;

const ADM_BLUE  = '#1565C0';
const ADM_DARK  = '#0A2744';
const ADM_LIGHT = '#e8f0f9';

const PASSWORD_RULES = [
  { required: true, message: 'Mot de passe requis' },
  {
    validator: (_, v) => {
      const s = String(v || '');
      if (s.length < 8) return Promise.reject(new Error('Au moins 8 caractères'));
      if (!/[A-Z]/.test(s)) return Promise.reject(new Error('Au moins une majuscule'));
      if (!/[0-9]/.test(s)) return Promise.reject(new Error('Au moins un chiffre'));
      if (!/[^A-Za-z0-9]/.test(s)) return Promise.reject(new Error('Au moins un caractère spécial'));
      return Promise.resolve();
    },
  },
];

export default function Repertoire() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { message: msg } = App.useApp();

  const [contacts,      setContacts]      = useState([]);
  const [orgDirs,       setOrgDirs]       = useState([]);  // { id, name, code, logoUrl }[]
  const [loading,       setLoading]       = useState(false);
  const [search,        setSearch]        = useState('');
  const [filterDir,     setFilterDir]     = useState(null); // directionLabel (string)
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [drawerContact, setDrawerContact] = useState(null);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf,  setExportingPdf]  = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountTarget, setAccountTarget] = useState(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [form] = Form.useForm();
  const [accountForm] = Form.useForm();

  const canAccess = canAccessRepertoire(user?.role);
  const canManage = canManageRepertoire(user?.role);
  const canEdit = canManage;
  const canDelete = canManage;
  const canCreateAppAccount = canManage;

  useEffect(() => {
    if (user && !canAccess) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, canAccess, navigate]);

  // ── Map name→direction pour enrichissement visuel ─────────────────────────
  const orgDirByName = useMemo(() => {
    const m = {};
    orgDirs.forEach((d) => { m[d.name.trim().toLowerCase()] = d; });
    return m;
  }, [orgDirs]);

  const getOrgDir = (label) =>
    label ? orgDirByName[label.trim().toLowerCase()] || null : null;

  // ── Options Select filtre (par nom de direction) ──────────────────────────
  const filterOptions = useMemo(() =>
    orgDirs.map((d) => ({
      value: d.name,
      label: d.code ? `[${d.code}]  ${d.name}` : d.name,
    })),
  [orgDirs]);

  // ── Options Select formulaire (value = name de la direction) ─────────────
  const formOptions = useMemo(() =>
    orgDirs.map((d) => ({
      value: d.name,
      label: (
        <Space size={6}>
          {d.code && (
            <Tag color="blue" style={{ fontSize: 10, padding: '0 5px', margin: 0, fontWeight: 700 }}>
              {d.code}
            </Tag>
          )}
          <span>{d.name}</span>
        </Space>
      ),
      searchLabel: `${d.code || ''} ${d.name}`.toLowerCase(),
    })),
  [orgDirs]);

  // ── Chargement ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)    params.search    = search;
      if (filterDir) params.direction = filterDir;

      const [contRes, dirRes] = await Promise.all([
        api.get('/repertoire', { params }),
        api.get('/repertoire/directions'),
      ]);
      setContacts(contRes.data || []);
      setOrgDirs(dirRes.data   || []);
    } catch {
      msg.error('Erreur lors du chargement du répertoire');
    } finally {
      setLoading(false);
    }
  }, [search, filterDir]);

  useEffect(() => { load(); }, [load]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditTarget(record);
    form.setFieldsValue({
      numero:        record.numero,
      prenomNom:     record.prenomNom,
      fonction:      record.fonction,
      directionLabel: record.directionLabel,
      poste:         record.poste,
      directe:       record.directe,
      portable:      record.portable,
      email:         record.email,
      ordre:         record.ordre,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        numero:        values.numero,
        prenomNom:     values.prenomNom,
        fonction:      values.fonction   || null,
        directionLabel: values.directionLabel,
        poste:         values.poste      || null,
        directe:       values.directe    || null,
        portable:      values.portable   || null,
        email:         values.email?.trim() || null,
        ordre:         values.ordre,
      };
      if (editTarget) {
        await api.put(`/repertoire/${editTarget.id}`, payload);
        msg.success('Contact modifié');
      } else {
        await api.post('/repertoire', payload);
        msg.success('Contact ajouté');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      if (err?.errorFields) return;
      msg.error(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/repertoire/${id}`);
      msg.success('Contact supprimé');
      load();
    } catch (err) {
      msg.error(err.response?.data?.error || 'Erreur suppression');
    }
  };

  const openCreateAccount = (record) => {
    setAccountTarget(record);
    accountForm.resetFields();
    accountForm.setFieldsValue({ role: 'RESPONSABLE' });
    setAccountModalOpen(true);
  };

  const handleCreateAccount = async () => {
    if (!accountTarget?.id) return;
    try {
      const values = await accountForm.validateFields();
      setAccountSaving(true);
      await api.post(`/repertoire/${accountTarget.id}/create-account`, {
        password: values.password,
        role: values.role,
      });
      msg.success('Compte créé — e-mail d\'activation envoyé à l\'adresse du répertoire');
      setAccountModalOpen(false);
      setAccountTarget(null);
      accountForm.resetFields();
    } catch (err) {
      if (err?.errorFields) {
        return Promise.reject(err);
      }
      msg.error(err.response?.data?.error || 'Erreur lors de la création du compte');
    } finally {
      setAccountSaving(false);
    }
    return undefined;
  };

  const exportDocx = async () => {
    setExportingDocx(true);
    try {
      const exportSearch = search?.trim() || filterDir || '';
      await downloadRepertoireDocx(api, { search: exportSearch, publicExport: false });
      msg.success('Export Word téléchargé');
    } catch {
      msg.error('Erreur export Word');
    } finally {
      setExportingDocx(false);
    }
  };

  const exportPdf = async () => {
    setExportingPdf(true);
    try {
      await exportRepertoirePdf(filtered, { orgDirByName });
      msg.success('Export PDF téléchargé');
    } catch (err) {
      msg.error('Erreur export PDF');
      console.error(err);
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Filtrage local ────────────────────────────────────────────────────────
  const filtered = contacts.filter((c) => {
    const q = search.trim().toLowerCase();
    const dMatch = !filterDir ||
      c.directionLabel?.toLowerCase().includes(filterDir.toLowerCase());
    if (!q) return dMatch;
    return dMatch && (
      c.prenomNom?.toLowerCase().includes(q)     ||
      c.fonction?.toLowerCase().includes(q)      ||
      c.directionLabel?.toLowerCase().includes(q)||
      c.poste?.toLowerCase().includes(q)         ||
      c.portable?.toLowerCase().includes(q)      ||
      c.directe?.toLowerCase().includes(q)       ||
      c.email?.toLowerCase().includes(q)
    );
  });

  // ── Groupement trié ───────────────────────────────────────────────────────
  const grouped = {};
  for (const c of filtered) {
    const label = c.directionLabel || '(Sans direction)';
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(c);
  }
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) =>
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  );

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'N°', dataIndex: 'numero', width: 52, align: 'center',
      render: (v) => v
        ? <Text strong style={{ color: ADM_BLUE }}>{String(v).padStart(2, '0')}</Text>
        : <Text type="secondary">–</Text>,
    },
    {
      title: 'Prénoms et Nom', dataIndex: 'prenomNom', width: 210,
      render: (v, r) => (
        <Button type="link"
          style={{ padding: 0, color: ADM_DARK, fontWeight: 600, textAlign: 'left', height: 'auto', whiteSpace: 'normal' }}
          onClick={() => { setDrawerContact(r); setDrawerOpen(true); }}>
          <UserOutlined style={{ marginRight: 6, color: ADM_BLUE }} />{v}
        </Button>
      ),
    },
    {
      title: 'Fonction', dataIndex: 'fonction', ellipsis: true,
      render: (v) => v || <Text type="secondary">–</Text>,
    },
    {
      title: 'Poste', dataIndex: 'poste', width: 80, align: 'center',
      render: (v) => v
        ? <Tag color="blue" icon={<PhoneOutlined />}>{v}</Tag>
        : <Text type="secondary">–</Text>,
    },
    {
      title: 'Directe', dataIndex: 'directe', width: 145, align: 'center',
      render: (v) => v
        ? <a href={`tel:${v.replace(/\s/g, '')}`} style={{ color: ADM_BLUE }}><PhoneOutlined /> {v}</a>
        : <Text type="secondary">–</Text>,
    },
    {
      title: 'Portable', dataIndex: 'portable', width: 145, align: 'center',
      render: (v) => v
        ? <a href={`tel:${v.replace(/\s/g, '')}`} style={{ color: ADM_DARK, fontWeight: 500 }}><MobileOutlined /> {v}</a>
        : <Text type="secondary">–</Text>,
    },
    {
      title: 'E-mail', dataIndex: 'email', width: 200, ellipsis: true,
      render: (v) => v
        ? <a href={`mailto:${v.trim()}`} style={{ color: ADM_BLUE }}><MailOutlined /> {v}</a>
        : <Text type="secondary">–</Text>,
    },
    ...((canEdit || canCreateAppAccount) ? [{
      title: '', key: 'actions', width: canCreateAppAccount ? 108 : 72, align: 'center',
      render: (_, r) => (
        <Space size={4}>
          {canCreateAppAccount && (
            <Tooltip title={r.email?.trim() ? 'Créer un compte application (e-mail d\'activation)' : 'Ajoutez un e-mail sur la fiche du contact'}>
              <Button
                size="small"
                type="text"
                icon={<UserAddOutlined />}
                disabled={!r.email?.trim()}
                onClick={() => openCreateAccount(r)}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
          )}
          {canEdit && (
            <Tooltip title="Modifier">
              <Button size="small" type="text" icon={<EditOutlined />}
                onClick={() => openEdit(r)} style={{ color: ADM_BLUE }} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm title="Supprimer ce contact ?" description="Cette action est irréversible."
              onConfirm={() => handleDelete(r.id)} okText="Supprimer" cancelText="Annuler"
              okButtonProps={{ danger: true }}>
              <Tooltip title="Supprimer">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  const tableData = [];
  let globalIdx = 0;
  for (const [label, members] of sortedGroups) {
    tableData.push({ key: `dir-${label}`, _isGroupHeader: true, _groupLabel: label });
    for (const c of members) {
      tableData.push({ ...c, key: c.id, _rowIndex: globalIdx++ });
    }
  }

  const totalContacts   = contacts.length;
  const totalDirections = sortedGroups.length;
  const avecPortable    = contacts.filter((c) => c.portable).length;

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* ── En-tête ── */}
      <div style={{
        background: `linear-gradient(135deg, ${ADM_DARK} 0%, ${ADM_BLUE} 100%)`,
        borderRadius: 12, padding: '20px 24px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <Space align="center" size={16}>
          <img src="/adm_logo.png" alt="ADM"
            style={{ height: 52, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          <div>
            <Title level={4} style={{ color: '#fff', margin: 0, letterSpacing: '0.03em' }}>
              RÉPERTOIRE TÉLÉPHONIQUE
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
              Agence de Développement Municipal — 2026
            </Text>
          </div>
        </Space>
        <Space wrap>
          <Button icon={<FileWordOutlined />} onClick={exportDocx} loading={exportingDocx}
            style={{ background: '#2B579A', borderColor: '#2B579A', color: '#fff' }}>
            Export Word
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={exportPdf} loading={exportingPdf}
            style={{ background: '#CC0000', borderColor: '#CC0000', color: '#fff' }}>
            Export PDF
          </Button>
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
              style={{ background: '#fff', color: ADM_DARK, borderColor: '#fff', fontWeight: 600 }}>
              Ajouter un contact
            </Button>
          )}
        </Space>
      </div>

      {/* ── Statistiques ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { title: 'Contacts',    value: totalContacts,   icon: <UserOutlined />,      color: ADM_BLUE },
          { title: 'Directions',  value: totalDirections, icon: <ApartmentOutlined />, color: ADM_DARK },
          { title: 'Avec portable', value: avecPortable,  icon: <MobileOutlined />,    color: '#52c41a' },
        ].map(({ title, value, icon, color }) => (
          <Col xs={12} sm={8} key={title}>
            <Card bordered={false}
              style={{ borderRadius: 10, borderLeft: `4px solid ${color}` }}
              styles={{ body: { padding: '14px 20px' } }}>
              <Statistic title={title} value={value}
                prefix={<span style={{ color }}>{icon}</span>}
                valueStyle={{ color: ADM_DARK, fontSize: 22 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Filtres ── */}
      <Card bordered={false} style={{ borderRadius: 10, marginBottom: 16 }}
        styles={{ body: { padding: '12px 16px' } }}>
        <Space wrap style={{ width: '100%' }}>
          <Input
            prefix={<SearchOutlined style={{ color: ADM_BLUE }} />}
            placeholder="Rechercher nom, fonction, poste, e-mail…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            allowClear style={{ width: 300 }}
          />
          <Select
            placeholder={<Space size={4}><ApartmentOutlined />Toutes les directions</Space>}
            allowClear showSearch style={{ minWidth: 280 }}
            value={filterDir} onChange={setFilterDir}
            options={filterOptions} optionFilterProp="label"
          />
          <Tooltip title="Rafraîchir">
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading} />
          </Tooltip>
          {(search || filterDir) && (
            <Tag color="blue" style={{ margin: 0 }}>
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            </Tag>
          )}
        </Space>
      </Card>

      {/* ── Tableau ── */}
      <Card bordered={false} style={{ borderRadius: 10 }} styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={tableData} columns={columns} loading={loading}
          rowKey="key" size="small"
          pagination={{
            pageSize: 100, showSizeChanger: true,
            pageSizeOptions: ['50', '100', '200'],
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
          }}
          scroll={{ x: 980 }}
          onRow={(record) => {
            if (record._isGroupHeader) return { style: { cursor: 'default' } };
            return { style: { background: record._rowIndex % 2 === 1 ? ADM_LIGHT : '#fff' } };
          }}
          components={{
            body: {
              row: ({ children, ...rest }) => {
                const record = tableData.find((r) => r.key === rest['data-row-key']);
                if (record?._isGroupHeader) {
                  const orgDir = getOrgDir(record._groupLabel);
                  return (
                    <tr {...rest}>
                      <td colSpan={columns.length} style={{
                        background: `linear-gradient(90deg, ${ADM_DARK} 0%, ${ADM_BLUE} 100%)`,
                        padding: '8px 16px',
                        borderBottom: '2px solid rgba(255,255,255,0.15)',
                      }}>
                        <Space>
                          <ApartmentOutlined style={{ color: '#fff', fontSize: 13 }} />
                          {orgDir?.code && (
                            <Tag style={{
                              background: 'rgba(255,255,255,0.22)', border: 'none',
                              color: '#fff', fontSize: 10, fontWeight: 700,
                              padding: '0 6px', margin: 0,
                            }}>
                              {orgDir.code}
                            </Tag>
                          )}
                          <Text strong style={{ color: '#fff', fontSize: 12, letterSpacing: '0.04em' }}>
                            {record._groupLabel.toUpperCase()}
                          </Text>
                          <Badge
                            count={grouped[record._groupLabel]?.length}
                            style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, boxShadow: 'none' }}
                          />
                        </Space>
                      </td>
                    </tr>
                  );
                }
                return <tr {...rest}>{children}</tr>;
              },
            },
          }}
        />
      </Card>

      {/* ── Modal Créer / Modifier ── */}
      <Modal
        open={modalOpen}
        title={
          <Space>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: ADM_BLUE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <span style={{ color: ADM_DARK, fontWeight: 700 }}>
              {editTarget ? 'Modifier le contact' : 'Ajouter un contact'}
            </span>
          </Space>
        }
        onOk={handleSave} onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editTarget ? 'Enregistrer les modifications' : 'Ajouter le contact'}
        cancelText="Annuler"
        okButtonProps={{ style: { background: ADM_BLUE, borderColor: ADM_BLUE } }}
        width={660} destroyOnClose styles={{ body: { paddingTop: 8 } }}
      >
        <Form form={form} layout="vertical">

          {/* Identité */}
          <Divider orientation="left" orientationMargin={0}
            style={{ color: ADM_BLUE, borderColor: ADM_LIGHT, fontSize: 12, fontWeight: 600, marginBottom: 12, marginTop: 4 }}>
            <Space size={6}><UserOutlined />Identité</Space>
          </Divider>
          <Row gutter={12}>
            <Col xs={24} sm={6}>
              <Form.Item name="numero" label="N°">
                <Input type="number" min={1} placeholder="01" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={18}>
              <Form.Item name="prenomNom" label="Prénoms et Nom"
                rules={[{ required: true, message: 'Le nom est requis' }]}>
                <Input placeholder="Ex : Mamadou FALL"
                  prefix={<UserOutlined style={{ color: '#bbb' }} />} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="fonction" label="Fonction / Titre">
            <Input placeholder="Ex : Directeur Général, Chef de Service…" />
          </Form.Item>

          {/* Direction */}
          <Divider orientation="left" orientationMargin={0}
            style={{ color: ADM_BLUE, borderColor: ADM_LIGHT, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            <Space size={6}><ApartmentOutlined />Direction organisationnelle</Space>
          </Divider>
          <Form.Item
            name="directionLabel"
            label="Direction de rattachement"
            rules={[{ required: true, message: 'Veuillez sélectionner une direction' }]}
            extra={
              <Text type="secondary" style={{ fontSize: 11 }}>
                Les directions sont gérées dans <strong>Administration → Directions</strong>.
              </Text>
            }
          >
            <Select
              showSearch allowClear
              placeholder={
                <Space size={6}>
                  <ApartmentOutlined style={{ color: '#bbb' }} />
                  <span>Choisir une direction organisationnelle…</span>
                </Space>
              }
              options={formOptions}
              filterOption={(input, option) =>
                (option?.searchLabel || '').includes(input.toLowerCase())
              }
              notFoundContent={
                <div style={{ padding: '12px', textAlign: 'center', color: '#999' }}>
                  <ApartmentOutlined style={{ fontSize: 24, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  <div>Aucune direction trouvée.</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Créez-en une dans Administration → Directions.
                  </Text>
                </div>
              }
              style={{ width: '100%' }}
              optionLabelProp="label"
            />
          </Form.Item>

          {/* Coordonnées */}
          <Divider orientation="left" orientationMargin={0}
            style={{ color: ADM_BLUE, borderColor: ADM_LIGHT, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            <Space size={6}><PhoneOutlined />Coordonnées téléphoniques</Space>
          </Divider>
          <Row gutter={12}>
            <Col xs={24} sm={8}>
              <Form.Item name="poste" label="Poste interne">
                <Input placeholder="Ex : 131" prefix={<PhoneOutlined style={{ color: '#bbb' }} />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="directe" label="Ligne directe">
                <Input placeholder="Ex : 33 849 17 43" prefix={<PhoneOutlined style={{ color: '#bbb' }} />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="portable" label="Portable">
                <Input placeholder="Ex : 77 499 95 51" prefix={<MobileOutlined style={{ color: '#bbb' }} />} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="email"
            label="E-mail professionnel"
            rules={[
              {
                validator: (_, v) => {
                  const s = String(v || '').trim();
                  if (!s) return Promise.resolve();
                  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
                    ? Promise.resolve()
                    : Promise.reject(new Error('Format e-mail invalide'));
                },
              },
            ]}
          >
            <Input type="email" placeholder="prenom.nom@adm.sn" prefix={<MailOutlined style={{ color: '#bbb' }} />} allowClear />
          </Form.Item>
          <Form.Item name="ordre" label="Ordre d'affichage" style={{ marginBottom: 0 }}>
            <Input type="number" min={0} placeholder="0 — plus petit = affiché en premier" style={{ width: 260 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Drawer détail contact ── */}
      <Drawer
        title={
          <Space>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: ADM_BLUE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserOutlined style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ color: ADM_DARK, fontWeight: 700, lineHeight: 1.2 }}>
                {drawerContact?.prenomNom}
              </div>
              {drawerContact?.numero && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Contact N° {String(drawerContact.numero).padStart(2, '0')}
                </Text>
              )}
            </div>
          </Space>
        }
        open={drawerOpen} onClose={() => setDrawerOpen(false)} width={400}
      >
        {drawerContact && (() => {
          const orgDir = getOrgDir(drawerContact.directionLabel);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Direction */}
              <div style={{
                background: ADM_LIGHT, borderRadius: 10, padding: '14px 16px',
                borderLeft: `4px solid ${ADM_BLUE}`,
              }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                  DIRECTION ORGANISATIONNELLE
                </Text>
                <Space align="center" size={10}>
                  {orgDir?.logoUrl && (
                    <Avatar src={orgDir.logoUrl} size={34}
                      style={{ background: ADM_LIGHT, border: `1px solid ${ADM_BLUE}`, flexShrink: 0 }}
                      icon={<ApartmentOutlined />}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, color: ADM_DARK, fontSize: 14, lineHeight: 1.3 }}>
                      {drawerContact.directionLabel || '–'}
                    </div>
                    {orgDir?.code && (
                      <Tag color="blue" style={{ marginTop: 4, fontSize: 10 }}>{orgDir.code}</Tag>
                    )}
                  </div>
                </Space>
              </div>

              {/* Fonction */}
              <div style={{ background: '#fafafa', borderRadius: 8, padding: '12px 16px' }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>FONCTION</Text>
                <Text strong>{drawerContact.fonction || '–'}</Text>
              </div>

              {/* Téléphones */}
              <Row gutter={10}>
                <Col span={9}>
                  <div style={{
                    background: '#fafafa', borderRadius: 8, padding: 12,
                    textAlign: 'center', height: '100%',
                  }}>
                    <PhoneOutlined style={{ color: ADM_BLUE, fontSize: 20 }} />
                    <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>Poste interne</div>
                    <div style={{ fontWeight: 700, color: ADM_DARK, marginTop: 4, fontSize: 16 }}>
                      {drawerContact.poste || '–'}
                    </div>
                  </div>
                </Col>
                <Col span={15}>
                  <div style={{ background: '#fafafa', borderRadius: 8, padding: 12, height: '100%' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
                      <PhoneOutlined style={{ color: ADM_BLUE, marginRight: 4 }} />Ligne directe
                    </div>
                    {drawerContact.directe
                      ? <a href={`tel:${drawerContact.directe.replace(/\s/g, '')}`}
                          style={{ color: ADM_BLUE, fontWeight: 600, fontSize: 14 }}>
                          {drawerContact.directe}
                        </a>
                      : <Text type="secondary">Non renseigné</Text>}
                  </div>
                </Col>
              </Row>

              <div style={{
                background: `linear-gradient(135deg, ${ADM_DARK} 0%, ${ADM_BLUE} 100%)`,
                borderRadius: 10, padding: '16px', textAlign: 'center',
              }}>
                <MobileOutlined style={{ color: '#fff', fontSize: 22 }} />
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>PORTABLE</div>
                {drawerContact.portable
                  ? <a href={`tel:${drawerContact.portable.replace(/\s/g, '')}`}
                      style={{ color: '#fff', fontSize: 17, fontWeight: 700, display: 'block', marginTop: 4 }}>
                      {drawerContact.portable}
                    </a>
                  : <span style={{ color: 'rgba(255,255,255,0.45)', display: 'block', marginTop: 4 }}>
                      Non renseigné
                    </span>}
              </div>

              <div style={{ background: '#fafafa', borderRadius: 8, padding: '12px 16px' }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                  <MailOutlined style={{ marginRight: 6 }} />E-MAIL
                </Text>
                {drawerContact.email
                  ? <a href={`mailto:${drawerContact.email.trim()}`} style={{ color: ADM_BLUE, fontWeight: 600, wordBreak: 'break-all' }}>
                      {drawerContact.email}
                    </a>
                  : <Text type="secondary">Non renseigné</Text>}
              </div>

              {canCreateAppAccount && (
                <Button
                  block
                  icon={<UserAddOutlined />}
                  disabled={!drawerContact.email?.trim()}
                  onClick={() => { setDrawerOpen(false); openCreateAccount(drawerContact); }}
                  style={{ borderColor: '#52c41a', color: '#52c41a', fontWeight: 600 }}
                >
                  Créer le compte application
                </Button>
              )}
              {canEdit && (
                <Button block icon={<EditOutlined />}
                  onClick={() => { setDrawerOpen(false); openEdit(drawerContact); }}
                  style={{ background: ADM_BLUE, borderColor: ADM_BLUE, color: '#fff', fontWeight: 600 }}>
                  Modifier ce contact
                </Button>
              )}
            </div>
          );
        })()}
      </Drawer>

      <Modal
        title={
          <Space>
            <UserAddOutlined style={{ color: '#52c41a' }} />
            <span>Créer le compte application</span>
          </Space>
        }
        open={accountModalOpen}
        onOk={handleCreateAccount}
        onCancel={() => { setAccountModalOpen(false); setAccountTarget(null); accountForm.resetFields(); }}
        okText="Créer et envoyer l’e-mail"
        cancelText="Annuler"
        confirmLoading={accountSaving}
        destroyOnClose
        width={480}
      >
        {accountTarget && (
          <div style={{ marginTop: 8 }}>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Un compte sera créé avec le nom et l’e-mail de cette ligne du répertoire. La direction sera rattachée automatiquement si son libellé correspond à une direction organisationnelle."
            />
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              <strong>{accountTarget.prenomNom}</strong>
              {accountTarget.email ? (
                <> · <MailOutlined style={{ margin: '0 4px' }} />{accountTarget.email}</>
              ) : null}
            </Text>
            <Form form={accountForm} layout="vertical">
              <Form.Item name="role" label="Rôle dans l’application" rules={[{ required: true }]} initialValue="RESPONSABLE">
                <Select>
                  <Select.Option value="RESPONSABLE">Responsable</Select.Option>
                  <Select.Option value="CONSOLIDATEUR">Consolidateur</Select.Option>
                  <Select.Option value="COORDINATEUR_PROJET">Coordinateur de projet</Select.Option>
                  <Select.Option value="SECRETAIRE_GENERAL">Secrétaire général</Select.Option>
                  <Select.Option value="DG">Directeur général</Select.Option>
                  <Select.Option value="ADMIN">Administrateur</Select.Option>
                  <Select.Option value="SUPER_ADMIN">Super administrateur</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="password" label="Mot de passe initial" rules={PASSWORD_RULES} hasFeedback>
                <Input.Password placeholder="8+ caractères, majuscule, chiffre, caractère spécial" autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="Confirmer le mot de passe"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Confirmation requise' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error('Les mots de passe ne correspondent pas'));
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
