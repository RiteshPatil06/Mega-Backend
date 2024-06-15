import mongoose, {Model, isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleLike = async ( Model, resourceId, userId ) => {

    if (!isValidObjectId(resourceId)) throw new ApiError(400, "Invalid resource Id");
    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid user id");

    const resource = await Model.findById(resourceId);
    if (!resource) throw new ApiError(404, "resource not found");

    const resourceField = Model.modelName.toLoweCase();

    const isLiked = await Like.findOne({ [resourceField]: resourceId, likedBy: userId })

    var response;

    try {
        response = isLiked 
        ?
        await Like.deleteOne({ [resourceField]: resourceId, likedBy: userId})
        :
        await Like.create({ [resourceField]: resourceId, likedBy: userId})
    } catch (error) {
        console.log("toogelike error ::", error);
        throw new ApiError(500, error?.message || "Internal server error in toogleLike")
    }

    const totalLikes = await Like.countDocuments({ [resourceField]: resourceId});
    return {
        response,
        isLiked,
        totalLikes
    }
}

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const { response, isLiked, totalLikes } = await toggleLike(Video, videoId, req.user?._id);

    return res.status(200).json(
        new ApiResponse(
            201,
            {
                response,
                totalLikes
            },
            isLiked === null ? "liked successfully" : "unliked successfully"
        )
    )

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const { response, likedBy, totalLikes } = await toggleLike(Comment, commentId, req.user?._id);

    return res.status(200).json(
        new ApiResponse(
            201,
            {
                response,
                totalLikes
            },
            isLiked === null ? "liked successfully" : "unliked successfully"
        )
    )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const { response, likedBy, totalLikes } = await toggleLike(Tweet, tweetId, req.user?._id)

    return res.status(200).json(
        new ApiResponse(
            201,
            {
                response,
                totalLikes
            },
            isLiked === null ? "liked successfully" : "unliked successfully"
        )
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    if (!req.user?._id) throw new ApiError(404, "Unauthorized request");
    const userId = req.user?._id;

    const pipeline= [
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: "$avatar.url"
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner: {
                                $first: "$video.owner"
                            }
                        }
                    },
                    {
                        $addFields: {
                            videoFile: "$videoFile.url"
                        }
                    },
                    {
                        $addFields:{
                            thumbnail: "$thumbnail.url"
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$video"
        },
        {
            $replaceRoot: {
                newRoot: "$video"
            }
        }
        
    ]
    try {
        const likedVideos = await Like.aggregate(pipeline)
        return res.status(200).json(
            new ApiResponse(
                200,
                likedVideos,
                "liked videos fetched successfully"
            )
        )
    } catch (error) {
        console.log("getLikedVideos ::", error);
        throw new ApiError(500, error?.message || "Internal server error in getLikedVideos")
    }
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}