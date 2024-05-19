import { DELTA, notZero, COBB_DOUGLAS, HOM_COBB_DOUGLAS, DYN_HOM_COBB_DOUGLAS, marginalUtility, gradient, negative, CES } from '../artifacts/utility';

describe('Utility Functions', () => {
    test('COBB_DOUGLAS computes correct utility', () => {
        const utility = COBB_DOUGLAS([0.5, 0.5]);
        expect(utility([4, 4])).toBeCloseTo(4, 5);
    });

    test('HOM_COBB_DOUGLAS computes correct utility', () => {
        const utility = HOM_COBB_DOUGLAS(2);
        expect(utility([4, 4])).toBeCloseTo(4, 5);
    });

    test('DYN_HOM_COBB_DOUGLAS computes correct utility', () => {
        const utility = DYN_HOM_COBB_DOUGLAS([1, 1]);
        expect(utility([4, 4])).toBeCloseTo(4, 5);
    });

    test('marginalUtility computes correct value', () => {
        const utility = COBB_DOUGLAS([0.5, 0.5]);
        const result = marginalUtility(utility, [1, 1], 0);
        expect(result).toBeCloseTo(0.5, 2);
    });

    test('gradient computes correct values', () => {
        const utility = COBB_DOUGLAS([0.5, 0.5]);
        const result = gradient(utility, [1, 1]);
        expect(result[0]).toBeCloseTo(0.5, 2);
        expect(result[1]).toBeCloseTo(0.5, 2);
    });

    test('negative computes correct values', () => {
        expect(negative([1, 2, 3])).toEqual([-1, -2, -3]);
    });

    test('CES computes correct utility', () => {
        const utility = CES([0.5, 0.5], 0.5);
        expect(utility([4, 4])).toEqual(16);
    });
});
