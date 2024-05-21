import { pow } from 'math';
import { reduce } from 'lodash';

const DELTA = 1;
// const DELTA = 1e-6;

const notZero = (x) => x.map(i => i !== 0 ? i : 1e-10);

// A Cobb-Douglas function for a given set of exponents p
const COBB_DOUGLAS = (p) => (x) => reduce(x.map((i, j) => pow(i, p[j])), (i, j) => i * j);

// A homogeneous Cobb-Douglas function for an array of length len: U = x1^1/len * x2^1/len * ... * xn^1/len
const HOM_COBB_DOUGLAS = (len) => COBB_DOUGLAS(Array(len).fill(1 / len));

// A dynamic homogeneous Cobb-Douglas function for a given array a
const DYN_HOM_COBB_DOUGLAS = (a) => HOM_COBB_DOUGLAS(a.length);

const marginalUtility = (utility, bundle, good, delta = DELTA) => {
    const bundleCopy = [...bundle];
    bundleCopy[good] += delta;
    return (utility(bundleCopy) - utility(bundle)) / DELTA;
};

const gradient = (utility, bundle, delta = DELTA) =>
    bundle.map((_, good) => marginalUtility(utility, bundle, good, delta));

const negative = (bundle) => bundle.map(x => -x);

const CES = (p, rho) => (x) => pow(reduce(x.map(i => pow(i, rho)), (i, j) => i + j), 1 / rho);

export { DELTA, notZero, COBB_DOUGLAS, HOM_COBB_DOUGLAS, DYN_HOM_COBB_DOUGLAS, marginalUtility, gradient, negative, CES };
