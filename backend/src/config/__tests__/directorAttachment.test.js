const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    assertExclusiveAttachment,
    ATTACHMENT_ERRORS,
    isEligibleDirectionDirector,
    directorRoleToKeep,
} = require('../directorWorkflow');

describe('assertExclusiveAttachment', () => {
    const userA = { id: 'u1', role: 'ASSISTANT', directionId: 'dir-a' };

    it('autorise un premier rattachement Assistant', () => {
        const check = assertExclusiveAttachment(
            { id: 'u2', role: 'RESPONSABLE', directionId: null },
            'dir-a',
            'ASSISTANT',
        );
        assert.equal(check.ok, true);
    });

    it('refuse un second rattachement Assistant (cas 5)', () => {
        const check = assertExclusiveAttachment(userA, 'dir-b', 'ASSISTANT');
        assert.equal(check.ok, false);
        assert.equal(check.code, 'ALREADY_ASSISTANT');
        assert.match(check.error, /déjà Assistant/);
    });

    it('refuse un DG déjà rattaché à une autre direction (cas 6)', () => {
        const check = assertExclusiveAttachment(
            { id: 'u3', role: 'DG', directionId: 'dir-a' },
            'dir-b',
            'DG',
        );
        assert.equal(check.ok, false);
        assert.equal(check.code, 'ALREADY_DG');
        assert.equal(check.error, ATTACHMENT_ERRORS.ALREADY_DG);
    });

    it('refuse DG → Assistant d\'une autre direction (cas 7)', () => {
        const check = assertExclusiveAttachment(
            { id: 'u3', role: 'DG', directionId: 'dir-a' },
            'dir-b',
            'ASSISTANT',
        );
        assert.equal(check.ok, false);
        assert.equal(check.code, 'CROSS_ROLE');
    });

    it('refuse Assistant → DG d\'une autre direction (cas 8)', () => {
        const check = assertExclusiveAttachment(userA, 'dir-b', 'DG');
        assert.equal(check.ok, false);
        assert.equal(check.code, 'CROSS_ROLE');
    });

    it('autorise le remplacement explicite (changement de direction)', () => {
        const check = assertExclusiveAttachment(userA, 'dir-b', 'ASSISTANT', { replaceExisting: true });
        assert.equal(check.ok, true);
    });

    it('autorise de rester Assistant de la même direction', () => {
        const check = assertExclusiveAttachment(userA, 'dir-a', 'ASSISTANT');
        assert.equal(check.ok, true);
    });

    it('refuse un second DG sur la même direction sans replace', () => {
        const check = assertExclusiveAttachment(
            { id: 'u4', role: 'RESPONSABLE', directionId: 'dir-a' },
            'dir-a',
            'DG',
            { currentDirectorId: 'u-other' },
        );
        assert.equal(check.ok, false);
        assert.equal(check.code, 'DIRECTION_HAS_DG');
    });

    it('exige une direction pour DG/ASSISTANT', () => {
        const check = assertExclusiveAttachment(userA, null, 'ASSISTANT');
        assert.equal(check.ok, false);
        assert.equal(check.code, 'DIRECTION_REQUIRED');
    });
});

describe('isEligibleDirectionDirector', () => {
    it('accepte DG, Admin, Super admin', () => {
        assert.equal(isEligibleDirectionDirector({ role: 'DG' }), true);
        assert.equal(isEligibleDirectionDirector({ role: 'ADMIN' }), true);
        assert.equal(isEligibleDirectionDirector({ role: 'SUPER_ADMIN' }), true);
    });

    it('accepte un intitulé Directeur', () => {
        assert.equal(isEligibleDirectionDirector({ role: 'RESPONSABLE', jobTitle: 'Directeur commercial' }), true);
    });

    it('refuse Assistant et Responsable sans intitulé Directeur', () => {
        assert.equal(isEligibleDirectionDirector({ role: 'ASSISTANT' }), false);
        assert.equal(isEligibleDirectionDirector({ role: 'RESPONSABLE', jobTitle: 'Chargé de mission' }), false);
    });

    it('conserve Admin / Super admin à l\'affectation', () => {
        assert.equal(directorRoleToKeep({ role: 'ADMIN' }), 'ADMIN');
        assert.equal(directorRoleToKeep({ role: 'SUPER_ADMIN' }), 'SUPER_ADMIN');
        assert.equal(directorRoleToKeep({ role: 'RESPONSABLE', jobTitle: 'Directeur' }), 'DG');
    });
});
