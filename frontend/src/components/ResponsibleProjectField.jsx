import { Alert, Form, Select } from 'antd';
import {
    NO_RESPONSIBLE_PROJECT_DESCRIPTION,
    NO_RESPONSIBLE_PROJECT_TITLE,
    hasMultipleAssignableProjects,
    projectFieldLabel,
    projectLabel,
    projectSelectRules,
    projectsSummaryLabel,
} from '../utils/projectScope';

export function ResponsibleProjectBanner({
    user,
    assignableProjects,
    loading,
    primaryProject,
}) {
    if (!user || !assignableProjects) return null;

    if (loading) {
        return (
            <Alert
                type="info"
                showIcon
                message="Chargement de vos projets…"
                style={{ marginBottom: 16 }}
            />
        );
    }

    if (assignableProjects.length === 0) {
        return (
            <Alert
                type="warning"
                showIcon
                message={NO_RESPONSIBLE_PROJECT_TITLE}
                description={NO_RESPONSIBLE_PROJECT_DESCRIPTION}
                style={{ marginBottom: 16 }}
            />
        );
    }

    if (assignableProjects.length === 1) {
        const display = primaryProject || assignableProjects[0];
        return (
            <Alert
                type="info"
                showIcon
                message={`Projet : ${projectLabel(display)}`}
                description="Cette création sera rattachée à votre projet."
                style={{ marginBottom: 16 }}
            />
        );
    }

    return (
        <Alert
            type="info"
            showIcon
            message={`Vous êtes responsable de ${assignableProjects.length} projets`}
            description={`Choisissez le projet concerné : ${projectsSummaryLabel(assignableProjects)}.`}
            style={{ marginBottom: 16 }}
        />
    );
}

export default function ResponsibleProjectField({
    user,
    assignableProjects,
    lockedSingle,
    size = 'middle',
}) {
    const list = assignableProjects || [];
    const rules = projectSelectRules(user, list);
    const required = rules.length > 0;
    const multiple = hasMultipleAssignableProjects(list);

    return (
        <Form.Item
            name="projectId"
            label={projectFieldLabel(user, list)}
            rules={rules}
        >
            <Select
                allowClear={!required}
                disabled={required && lockedSingle}
                showSearch={multiple}
                optionFilterProp="label"
                placeholder={
                    multiple
                        ? 'Sélectionner un de vos projets'
                        : (required ? 'Votre projet' : 'Choisir un projet')
                }
                size={size}
                options={list.map((p) => ({
                    value: p.id,
                    label: projectLabel(p),
                }))}
            />
        </Form.Item>
    );
}
