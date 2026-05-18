import { Popconfirm } from 'antd';
import { FORCE_DELETE_OK_TEXT } from '../utils/deleteConfirm';

/**
 * Popconfirm renforcé pour suppressions super administrateur.
 */
export default function ForceDeletePopconfirm({
    title,
    description,
    onConfirm,
    children,
    loading = false,
    disabled = false,
}) {
    return (
        <Popconfirm
            title={title}
            description={description}
            okText={FORCE_DELETE_OK_TEXT}
            cancelText="Annuler"
            okButtonProps={{ danger: true, loading }}
            disabled={disabled}
            onConfirm={onConfirm}
        >
            {children}
        </Popconfirm>
    );
}
