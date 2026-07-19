import { Router } from "express";
import { AttendanceController } from "../controllers/attendanceController";
import { validateKindergartenData } from "../middleware/validationMiddleware";

const router = Router();

router.get("/attendance", validateKindergartenData, AttendanceController.getAttendance);
router.post("/attendance", validateKindergartenData, AttendanceController.createAttendance);
router.post("/attendance/:id/checkout", AttendanceController.checkoutChild);

// Hardware device integrations (QR, Biometrics)
router.post("/attendance/scan-qr", AttendanceController.scanQr);
router.post("/attendance/scan", AttendanceController.attendanceScan);
router.post("/face-id/scan", AttendanceController.faceIdScan);

export default router;
