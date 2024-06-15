import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    if(!req.user?._id) throw new ApiError(404, "Unauthorized request");
    const userId = req.user?._id;

    try{
    const channelStats = await Video.aggregate([
        //Match videos owned by the current user
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        //lookup subscriptions to the channel
        {
            $lookup:  {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "subscribers",
            }
        },
        //lookup subscriptions made by the channel
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "subscriber",
                as: "subscribeTo"
            }
        },
        //lookup likes for users video
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likedVideos"
            }
        },
        //lookup comments for users video
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "viddeo",
                as: "videoComments"
            }
        },
        //lookup tweets by the user
        {
            $lookup: {
                from: "tweets",
                localField: "owner",
                foreignField: "owner",
                as: "tweets"
            }
        },
        //group to calculate stats
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" },
                subscribers: { $first: "$subscribers" },
                subscribedTo: { $first: "$subscribedTo" },
                totalLikes: { $sum: { $size: "$likedVideos" } },
                totalComments: { $sum: { $size: "$videoComments" } },
                totalTweets: { $first: { $size: "$tweets" } },
              },
        },
         // Project the desired fields
      {
        $project: {
          _id: 0,
          totalVideos: 1,
          totalViews: 1,
          subscribers: { $size: "$subscribers" },
          subscribedTo: { $size: "$subscribedTo" },
          totalLikes: 1,
          totalComments: 1,
          totalTweets: 1,
        },
      },
    ]);

    res.status(200).json(new ApiResponse(200,channelStats[0],"Channel stats fetched successfully"));
  } catch (err) {
    console.error("Error in getChannelStats:", err);
    res.status(500).json(new ApiResponse(500, null, err.message));
  }
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    if(!req.user?._id) throw new ApiError(404, "Unauthorized request");
    const userId = req.user?._id;

    const video = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
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
                            avatar: "$avatar.url",
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $addFields: {
                videoFile: "$videoFile.url"
            }
        },
        {
            $addFields: {
                thumbnail: "$thumbnail.url"
            }
        }
    ];

    try {
        const videos = await Video.aggregate(video)
        console.log("allvideos ::" , allVideos);
        return res.status(200).json(new ApiResponse(200, allvideos, "Videos fetched successfully"))
        
    } catch (error) {
        console.log("Error while deleting the video", error);
        throw new ApiError(500, "server error while fetching the video");
    }

})

export {
    getChannelStats, 
    getChannelVideos
    }