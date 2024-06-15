import mongoose from "mongoose"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
   try {
     const dbStatus = mongoose.connection.readyState ? "db connected" : "db disconnected";
     const healthcheck = {
        dbStatus,
        uptime: process.uptime(),
        message: "healthcheck successful",
        timestamp: Date.now(),
        hrtime: process.hrtime(),
        serverStatus: `Server is running on port ${process.env.PORT}`
    }
    return res.status(200).json(
        new ApiResponse(200, healthcheck, "Health check successfully")
    )
   } catch (error) {
    const healthcheck = {
        dbStatus,
        uptime: process.uptime(),
        message: "healthcheck failed",
        timestamp: Date.now(),
        hrtime: process.hrtime(),
        error: error?.message,
    }
    console.log("Error in health Check ::", error);
    return res.status(500).json(
        500,
        healthcheck,
        "Health check failed"
    )
   }
})

export {
    healthcheck
    }
    