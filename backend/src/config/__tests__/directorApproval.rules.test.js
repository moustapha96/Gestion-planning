const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { canActorApprove } = require('../../services/directorApproval.service');

describe('canActorApprove', () => {
    const request = { directionId: 'dir-a', createdById: 'assistant-1', organizerId: 'assistant-1' };

    it('autorise le DG de la même direction', () => {
        const gate = canActorApprove(
            { id: 'dg-a', role: 'DG', directionId: 'dir-a' },
            request,
        );
        assert.equal(gate.ok, true);
    });

    it('refuse le DG d\'une autre direction (cas 4)', () => {
        const gate = canActorApprove(
            { id: 'dg-b', role: 'DG', directionId: 'dir-b' },
            request,
        );
        assert.equal(gate.ok, false);
        assert.match(gate.error, /pas le DG/i);
    });

    it('refuse l\'auto-validation par l\'Assistant', () => {
        const gate = canActorApprove(
            { id: 'assistant-1', role: 'ASSISTANT', directionId: 'dir-a' },
            request,
        );
        assert.equal(gate.ok, false);
        assert.match(gate.error, /propre demande/i);
    });

    it('autorise un ADMIN (supervision)', () => {
        const gate = canActorApprove(
            { id: 'admin-1', role: 'ADMIN', directionId: null },
            request,
        );
        assert.equal(gate.ok, true);
        assert.equal(gate.asAdmin, true);
    });
});
