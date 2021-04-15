import { expectType } from "tsd";
import { withGlobal, Clock } from "../";

expectType<Clock>(withGlobal(global).install());
