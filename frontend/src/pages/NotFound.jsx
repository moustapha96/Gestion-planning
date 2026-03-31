import { useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';

export default function NotFound() {
    const navigate = useNavigate();
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Result
                status="404"
                title="404"
                subTitle="Cette page n'existe pas."
                extra={
                    <Button type="primary" onClick={() => navigate('/dashboard')}>
                        Retour au tableau de bord
                    </Button>
                }
            />
        </div>
    );
}
