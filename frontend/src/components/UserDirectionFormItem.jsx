import { Form, Select } from 'antd';
import { ROLES, roleRequiresDirection } from '../utils/roles';

/**
 * Champ Direction :
 * - obligatoire pour Assistant
 * - optionnel pour DG (affectation possible ensuite sur la page Directions)
 */
export default function UserDirectionFormItem({ directions = [], label = 'Direction' }) {
    return (
        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.role !== cur.role}>
            {({ getFieldValue }) => {
                const role = getFieldValue('role');
                const required = roleRequiresDirection(role);
                const isDg = role === ROLES.DG;
                let extra;
                if (required) {
                    extra = 'Un Assistant doit être rattaché à une direction.';
                } else if (isDg) {
                    extra = 'Optionnel : vous pouvez laisser vide et affecter ce DG plus tard depuis la page Directions.';
                }
                return (
                    <Form.Item
                        name="directionId"
                        label={label}
                        rules={required ? [{
                            required: true,
                            message: 'Une direction est obligatoire pour le rôle Assistant.',
                        }] : []}
                        extra={extra}
                    >
                        <Select
                            allowClear={!required}
                            placeholder={required
                                ? 'Choisir une direction (obligatoire)'
                                : isDg
                                    ? 'Aucune pour l’instant (affecter plus tard)'
                                    : 'Aucune direction'}
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
