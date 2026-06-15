import { Alert, Form, Select } from 'antd';
import {
    NO_RESPONSIBLE_PROJECT_DESCRIPTION,
    NO_RESPONSIBLE_PROJECT_TITLE,
    projectFieldLabel,
    projectLabel,
    projectSelectRules,
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
                message="Chargement de votre projet…"
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

    const display = primaryProject || assignableProjects[0];
    // if (assignableProjects.length === 1 && display) {
    //     return (
    //         <Alert
    //             type="info"
    //             showIcon
    //             message={`Projet : ${projectLabel(display)}`}
    //             description="Cette création sera automatiquement rattachée à votre projet."
    //             style={{ marginBottom: 16 }}
    //         />
    //     );
    // }

    return null;
}

export default function ResponsibleProjectField({
    user,
    assignableProjects,
    lockedSingle,
    size = 'middle',
}) {
    const rules = projectSelectRules(user);
    const required = rules.length > 0;

    return (
        <Form.Item
            name="projectId"
            label={projectFieldLabel(user)}
            rules={rules}
        >
            <Select
                allowClear={!required}
                disabled={required && lockedSingle}
                placeholder={required ? 'Votre projet' : 'Choisir un projet'}
                size={size}
                options={(assignableProjects || []).map((p) => ({
                    value: p.id,
                    label: projectLabel(p),
                }))}
            />
        </Form.Item>
    );
}
