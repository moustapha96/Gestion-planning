import { Alert, Space, Tag, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Text } = Typography;

function formatValidatorList(workflow) {
    const names = workflow?.pendingValidatorNames?.length
        ? workflow.pendingValidatorNames
        : (workflow?.pendingValidators || []).map((v) => v.name).filter(Boolean);
    if (!names.length) return null;
    if (names.length === 1) return names[0];
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} (+${names.length - 3})`;
}

/**
 * Bandeau circuit de validation (étape + validateur(s) attendu(s)).
 */
export default function ValidationWorkflowBanner({ workflow, style }) {
    if (!workflow?.inWorkflow) return null;

    const validatorNames = formatValidatorList(workflow);
    const stepTag = workflow.stepLabel || `Étape ${workflow.currentStep}/${workflow.totalSteps}`;
    const scopeLabel = workflow.resolverScopeLabel;
    const isLegacy = workflow.legacy;

    const description = validatorNames
        ? `En attente de : ${validatorNames} (${scopeLabel || 'validateur désigné'})`
        : `En attente du ${scopeLabel || 'validateur désigné'}`;

    return (
        <Alert
            type={isLegacy ? 'info' : 'warning'}
            showIcon
            style={{ marginBottom: 16, ...style }}
            message={(
                <Space wrap size={[8, 4]}>
                    <Tag color={workflow.currentStep === 1 ? 'blue' : 'purple'}>{stepTag}</Tag>
                    {workflow.actionLabel && (
                        <Tag>{workflow.actionLabel}</Tag>
                    )}
                </Space>
            )}
            description={(
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text>
                        <UserOutlined style={{ marginRight: 6 }} />
                        {description}
                    </Text>
                    {workflow.currentStep === 1 && (
                        <Text type="secondary">
                            Après cette étape, le dossier sera transmis au consolidateur (projet, direction ou rôle global).
                        </Text>
                    )}
                    {workflow.currentStep === 2 && !isLegacy && (
                        <Text type="secondary">
                            Publication sur le calendrier après consolidation par le validateur ci-dessus.
                        </Text>
                    )}
                </Space>
            )}
        />
    );
}
