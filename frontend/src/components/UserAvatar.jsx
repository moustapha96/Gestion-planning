/**
 * UserAvatar — composant réutilisable d'avatar utilisateur.
 * Affiche la photo de profil si disponible, sinon les initiales
 * sur fond coloré (couleur dérivée du nom, déterministe).
 *
 * Props:
 *  - user       : objet user (name, avatarUrl, updatedAt)
 *  - size       : taille en px (défaut 32)
 *  - style      : styles supplémentaires
 *  - className  : classe CSS supplémentaire
 */
import { useEffect, useState } from 'react';
import { Avatar } from 'antd';
import { resolveAvatarSrc } from '../utils/mediaUrl';

// Palette de 10 couleurs vives pour les initiales
const PALETTE = [
    '#1565C0', // bleu
    '#52c41a', // vert
    '#722ed1', // violet
    '#fa8c16', // orange
    '#eb2f96', // rose
    '#13c2c2', // cyan
    '#f5222d', // rouge
    '#2f54eb', // indigo
    '#a0d911', // lime
    '#fa541c', // orange-rouge
];

/** Dérive une couleur de la palette à partir du nom (déterministe). */
function hashColor(name) {
    if (!name) return '#1565C0';
    let h = 0;
    for (let i = 0; i < name.length; i++) {
        h = (h << 5) - h + name.charCodeAt(i);
        h |= 0; // conversion en int 32 bits
    }
    return PALETTE[Math.abs(h) % PALETTE.length];
}

/** Extrait les initiales (1 ou 2 lettres) depuis le nom complet. */
function initials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
}

export default function UserAvatar({ user, size = 32, style = {}, className }) {
    const [imgFailed, setImgFailed] = useState(false);
    const vKey = user?.updatedAt
        ? new Date(user.updatedAt).getTime()
        : (user?.avatarUrl || '');

    useEffect(() => {
        setImgFailed(false);
    }, [user?.avatarUrl, user?.updatedAt]);

    const src = !imgFailed && user?.avatarUrl
        ? resolveAvatarSrc(user.avatarUrl, vKey)
        : undefined;

    return (
        <Avatar
            size={size}
            src={src}
            className={className}
            onError={() => {
                setImgFailed(true);
                return true;
            }}
            style={{
                backgroundColor: src ? undefined : hashColor(user?.name),
                fontWeight: 600,
                flexShrink: 0,
                userSelect: 'none',
                ...style,
            }}
        >
            {!src && initials(user?.name)}
        </Avatar>
    );
}
