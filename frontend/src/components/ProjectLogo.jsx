import { useEffect, useState } from 'react';
import { ProjectOutlined } from '@ant-design/icons';
import {
    DEFAULT_PROJECT_LOGO,
    isDefaultProjectLogo,
    resolveProjectLogoSrc,
} from '../utils/mediaUrl';

/**
 * Affichage cohérent du logo projet (liste, fiche, formulaire).
 * Repli automatique sur le logo par défaut en cas d’erreur de chargement.
 */
export default function ProjectLogo({
    logoUrl,
    size = 48,
    alt = '',
    fit,
    style,
    className,
    showPlaceholder = false,
}) {
    const [failed, setFailed] = useState(false);
    const resolved = resolveProjectLogoSrc(logoUrl);
    const objectFit = fit || (size <= 56 ? 'cover' : 'contain');
    const borderRadius = Math.max(6, Math.round(size * 0.16));

    useEffect(() => {
        setFailed(false);
    }, [logoUrl]);

    const showIcon = showPlaceholder && (failed || (!logoUrl && isDefaultProjectLogo(logoUrl)));
    if (showIcon) {
        return (
            <div
                className={className}
                style={{
                    width: size,
                    height: size,
                    borderRadius,
                    background: '#f0f5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid #e6f0fa',
                    ...style,
                }}
                aria-hidden={!alt}
            >
                <ProjectOutlined style={{ fontSize: Math.round(size * 0.42), color: '#1565C0' }} />
            </div>
        );
    }

    const src = failed ? DEFAULT_PROJECT_LOGO : resolved;

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            style={{
                width: size,
                height: size,
                objectFit,
                objectPosition: 'center',
                borderRadius,
                border: '1px solid #f0f0f0',
                background: '#fafafa',
                flexShrink: 0,
                display: 'block',
                ...style,
            }}
        />
    );
}
