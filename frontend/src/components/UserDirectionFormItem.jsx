import { Form, Select } from 'antd';
import { roleRequiresDirection } from '../utils/roles';

/**
 * Champ Direction : obligatoire dès que le rôle choisi est DG ou Assistant.
 */
export default function UserDirectionFormItem({ directions = [], label = 'Direction' }) {
    return (
        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.role !== cur.role}>
            {({ getFieldValue }) => {
                const required = roleRequiresDirection(getFieldValue('role'));
                return (
                    <Form.Item
                        name="directionId"
                        label={label}
                        rules={required ? [{
                            required: true,
                            message: 'Une direction est obligatoire pour le rôle Directeur général ou Assistant.',
                        }] : []}
                        extra={required
                            ? 'Un DG ou un Assistant doit être rattaché à une seule direction. Le changement de rôle est alors enregistré immédiatement.'
                            : undefined}
                    >
                        <Select
                            allowClear={!required}
                            placeholder={required ? 'Choisir une direction (obligatoire)' : 'Aucune direction'}
                            showSearch
                            optionFilterProp="label"
                            options={directions.map((d) => ({
                                value: d.id,
                                label: d.code ? `${d.name} (${d.code})` : d.name,
                            }))}
                        />
                    </Form.Item>
                );
            }}
        </Form.Item>
    );
}
