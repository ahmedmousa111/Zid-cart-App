import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import cartsRouter from "./carts";
import campaignsRouter from "./campaigns";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(cartsRouter);
router.use(campaignsRouter);
router.use(webhooksRouter);

export default router;
