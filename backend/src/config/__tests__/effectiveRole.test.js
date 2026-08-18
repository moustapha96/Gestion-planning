const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { computeEffectiveRole } = require('../../services/roleConfig.service');

describe('computeEffectiveRole', () => {
    it('conserve DG et ASSISTANT même si élévation ADMIN', () => {
        assert.equal(computeEffectiveRole('DG', true), 'DG');
        assert.equal(computeEffectiveRole('ASSISTANT', true), 'ASSISTANT');
    });

    it('conserve COORDINATEUR et CONSOLIDATEUR', () => {
        assert.equal(computeEffectiveRole('COORDINATEUR', true), 'COORDINATEUR');
        assert.equal(computeEffectiveRole('CONSOLIDATEUR', true), 'CONSOLIDATEUR');
    });

    it('élève un RESPONSABLE vers ADMIN', () => {
        assert.equal(computeEffectiveRole('RESPONSABLE', true), 'ADMIN');
        assert.equal(computeEffectiveRole('RESPONSABLE', false), 'RESPONSABLE');
    });

    it('ne rétrograde jamais SUPER_ADMIN', () => {
        assert.equal(computeEffectiveRole('SUPER_ADMIN', true), 'SUPER_ADMIN');
        assert.equal(computeEffectiveRole('ADMIN', true), 'ADMIN');
    });
});
