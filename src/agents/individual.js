import { DYN_HOM_COBB_DOUGLAS, gradient, DELTA, marginalUtility } from '../artifacts/utility';
import { max, indexOf } from 'lodash';

const argmax = (arr) => {
    const maxValue = max(arr);
    return indexOf(arr, maxValue);
};

class Individual {
    constructor(endowment, u = DYN_HOM_COBB_DOUGLAS) {
        this.endowment = endowment;
        this.utility = u;
    }

    evaluate(bid) {
        const newBundle = this.endowment.map((x, i) => x + bid[i]);
        return newBundle.every(i => i >= 0) && this.utility(newBundle) > this.utility(this.endowment);
    }

    trade(bid) {
        this.endowment = this.endowment.map((x, i) => +(x + bid[i]).toFixed(3));
    }

    print() {
        console.log(this.endowment);
    }

    bestTrade() {
        const v = gradient(this.utility, this.endowment);
        const idx = argmax(v);
        const u = v.map((_, j) => (j === idx ? 1 : -this.MRS(this.endowment, idx, j)));
        return u.map(i => +(i * DELTA).toFixed(3));
    }

    MRS(bundle = this.endowment, i = 0, j = 1) {
        return marginalUtility(this.utility, bundle, i) / marginalUtility(this.utility, bundle, j);
    }
}

export default Individual;
