import Individual from '../agents/individual';
import { DYN_HOM_COBB_DOUGLAS, DELTA } from '../artifacts/utility';

describe('Individual Class', () => {
    let individual;

    beforeEach(() => {
        individual = new Individual([10, 10], DYN_HOM_COBB_DOUGLAS([1, 1]));
    });

    test('evaluate returns true for beneficial trades', () => {
        expect(individual.evaluate([1, 0])).toBe(true);
    });

    test('evaluate returns false for non-beneficial trades', () => {
        expect(individual.evaluate([-1, -1])).toBe(false);
    });

    test('trade updates endowment correctly', () => {
        individual.trade([1, 0]);
        expect(individual.endowment).toEqual([11, 10]);
    });

    test('bestTrade returns a trade with positive impact', () => {
        const trade = individual.bestTrade();
        expect(trade[0]).toBeCloseTo(DELTA, 3);
    });

    test('MRS returns correct marginal rate of substitution', () => {
        const mrs = individual.MRS([10, 10], 0, 1);
        expect(mrs).toBeCloseTo(1, 5);
    });
});
