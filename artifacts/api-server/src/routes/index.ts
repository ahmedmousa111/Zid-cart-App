import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import cartsRouter from "./carts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(cartsRouter);

export default router;
