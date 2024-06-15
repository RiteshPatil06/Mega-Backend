import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    if (!videoId) throw new ApiError(400, "Invalid user Id");

    const video = await Video.findById(videoId, {_id: 1});
    if(!video) throw new ApiError(401, "video not found");

    var commentAggregate;
    try {
        commentAggregate = Comment.aggregate([
        // stage 1 : getting all comments of a video using videoId
             {
                $match: {
                     videoId: mongoose.Types.ObjectId(videoId)
                 }
             },
             //stage 2 : getting user info from users collection
             {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                username: 1,
                                avatar: "$avatar.url",
                            }
                        }
                    ]
                }
             },
             {
                $addFields: {
                    owner: {
                        $first: "$owner"
                    }
                }
             },
             {
                $sort: {
                    "createdAt": -1
                }
             },
        ])
    } catch (error) {
        console.log("Error in aggregation:", error);
        throw new ApiError(500, error.message || "Internal server error in comment aggregation")
    }

    const options = {
        page,
        limit,
        customLabels: {
            docs: "comments",
            totalDocs: "totalComments",

        },
        skip: (page - 1) * limit,
        limit: parseInt(limit),
    }
    
    Comment.aggregatePaginate(
        commentAggregate,
        options
    ).then(result => {
        if (result?.comments.length === 0) {
            return res.status(200)
                .json(new ApiResponse(
                            200,
                            [],
                        "No comments found"
                        )
                )
        }
        return res.status(200)
            .json(new ApiResponse(
                200,
                result,
                "success"
        ))
    }).catch(error => {
        console.error("Error in aggregation:", error);
        res.status(500).
            json(new ApiResponse(500, error.message || "Internal server error"));
    })

    // console.log("comment :: ",comment)
    
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    if(!isValidObjectId(videoId)) throw new ApiError(400, "Video not found")

    const { content } = req.body;
    if (content?.trim() === "") throw new ApiError(400, "content is required")   
    
    const [video, user] = await Promise.all([
        Video.findById(videoId),
        User.findById(req.user?.id)
    ])    

    if (!user) throw new ApiError(404, "user not found");
    if (!video) throw new ApiError(404, "video not found");

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    })

    if (!comment) throw new ApiError(500, "something went wrong while adding comment");

    return res.status(200).json(new ApiResponse(201, comment, "comment added successfully!" ))


})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    if(!isValidObjectId(commentId)) throw new ApiError(400, "Comment not found")

    const comment = await Comment.findById(commentId, {_id: 1});
    if(!comment) throw new ApiError(404, "Comment not found")

    const { content } = req.body;
    if (content?.trim() === "") throw new ApiError(400, "content is required");
    
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        {
            new: true
        }
    )

    if (!updateComment) throw new ApiError(500, "something went wrong while updating comment")

    return res.status(200).json(new ApiResponse(200, updatedComment, "comment updated Successfully!"))    
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) throw new ApiError(400, "comment not found");

    const deletecomment = await Comment.findByIdAndDelete(
        commentId,
        {
            new: true
        }
    )
    if (!deleteComment) throw new ApiError(500, "something went wrong while deleting comment");
    return res.status(200).json(200, {}, "comment deleted successfully!")
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
