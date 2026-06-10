import { Router, type IRouter } from "express";
import healthRouter from "./health";
import patientsRouter from "./patients";
import queueRouter from "./queue";
import doctorsRouter from "./doctors";
import analyticsRouter from "./analytics";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(patientsRouter);
router.use(queueRouter);
router.use(doctorsRouter);
router.use(analyticsRouter);
router.use(settingsRouter);

export default router;
