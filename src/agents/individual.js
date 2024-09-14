import {
   DYN_HOM_COBB_DOUGLAS,
   gradient,
   DELTA,
   marginalUtility,
   negative,
} from "../artifacts/utility";
import { max, indexOf } from "lodash";

const argmax = (arr) => {
   const maxValue = max(arr);
   return indexOf(arr, maxValue);
};

// Base Trader class
class Trader {
   constructor(endowment, utility = DYN_HOM_COBB_DOUGLAS) {
      this.endowment = endowment;
      this.utility = utility;
   }

   evaluate(bid) {
      const newBundle = this.endowment.map((x, i) => x + bid[i]);
      return (
         newBundle.every((i) => i >= 0) &&
         this.utility(newBundle) > this.utility(this.endowment)
      );
   }

   trade(bid) {
      this.endowment = this.endowment.map((x, i) => +(x + bid[i]).toFixed(3));
   }

   print() {
      console.log(this.endowment);
   }

   bestTrade() {
      const v = gradient(this.utility, this.endowment);
      // console.dir(`Gradient: ${v} Endowmend: ${this.endowment} Utility: ${this.utility.params}`);
      const idx = argmax(v);
      const u = v.map((_, j) =>
         j === idx ? 1 : -this.MRS(this.endowment, idx, j),
      );
      const bid = u.map((i) => +(i * DELTA).toFixed(3));
      // if (!this.evaluate(bid)) {
      //     throw new Error('Bad bid!');
      // }
      return bid;
   }

   MRS(bundle = this.endowment, i = 0, j = 1) {
      return (
         marginalUtility(this.utility, bundle, i) /
         marginalUtility(this.utility, bundle, j)
      );
   }

   getUtility() {
      return this.utility;
   }
   getEndowment() {
      return this.endowment;
   }

   setEndowment(e) {
      this.endowment = e;
   }
}

// Individual class inheriting from Trader
class IndividualTrader extends Trader {
   constructor(attrs) {
      super(attrs.endowment, attrs.utility);
      this.name =
         attrs.name ||
         Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
      this.color = attrs.color || 0x000000 + Math.round(Math.random() * 0xffffff);
      this.obj = attrs.obj;
   }

   getName() {
      return this.name;
   }

   getColor() {
      return this.color;
   }

   getObj() {
      return this.obj;
   }
}

function run_trade_less(proposer, counterpart, bids) {
   var bid_accepted = false;
   const bid = proposer.bestTrade();
   if (counterpart.evaluate(negative(bid))) {
      proposer.trade(bid);
      counterpart.trade(negative(bid));
      bid_accepted = true;
      bids.push({ proposer: proposer.getName(), bid: bid });
   }
   if (!bid_accepted) {
      // console.log('No more trades');
      // console.dir(bids);
   }
   return bid_accepted;
}

function run_trade(proposer, counterpart, bids, first_run = true) {
   var bid_accepted = false;
   const bid = proposer.bestTrade();
   if (counterpart.evaluate(negative(bid))) {
      proposer.trade(bid);
      counterpart.trade(negative(bid));
      bid_accepted = true;
      bids.push({ proposer: proposer.getName(), bid: bid });
   }
   if (!bid_accepted) {
      if (first_run) {
         return run_trade(counterpart, proposer, bids, false);
      } else {
         return false;
      }
   } else {
      return true;
   }
}

export { IndividualTrader, run_trade };
