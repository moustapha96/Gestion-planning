import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';

const POLL_MS = 90_000;
const refreshListeners = new Set();

/** Déclenche un rafraîchissement dans tous les composants qui utilisent le hook. */
export function notifyPendingValidationsRefresh() {
    refreshListeners.forEach((fn) => fn());
}

export default function usePendingValidations(enabled = true) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!enabled) {
            setData(null);
            return;
        }
        setLoading(true);
        try {
            const res = await api.get('/validations/pending');
            setData(res.data || null);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        refresh();
        refreshListeners.add(refresh);
        if (!enabled) {
            return () => refreshListeners.delete(refresh);
        }
        const timer = setInterval(refresh, POLL_MS);
        return () => {
            refreshListeners.delete(refresh);
            clearInterval(timer);
        };
    }, [enabled, refresh]);

    return {
        loading,
        refresh,
        canSeeMenu: Boolean(data?.canSeeMenu),
        hasAccess: Boolean(data?.hasAccess),
        counts: data?.counts || {
            total: 0,
            meetings: 0,
            planningsConsolidate: 0,
            planningsCoordinate: 0,
            missions: 0,
            events: 0,
        },
        meetings: data?.meetings || [],
        planningsConsolidate: data?.planningsConsolidate || [],
        planningsCoordinate: data?.planningsCoordinate || [],
        missions: data?.missions || [],
        planningEvents: data?.planningEvents || [],
    };
}
