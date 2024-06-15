import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if (!isValidObjectId(channelId)) throw new ApiError(401, "Invalid channel id");
    if (!req.user?._id) throw new ApiError(401, "unauthoried error");
    const subscriberId = req.user?._id;

    const isSubscribed = await Subscription.findOne({ channel: channelId, subscriber: subscriberId});
    var response;
    try {
        response = isSubscribed 
        ?
        await Subscription.deleteOne({channel: channelId, subscriber: subscriberId})
        : 
        await Subscription.create({channel: channelId, subscriber: subscriberId});
    } catch (error) {
        console.log("toggle Subscription error ::", error);
        throw new ApiError(500, error?.message || "Internal server error in toggleSubscription")
    }

    return res.status(200).json(new ApiResponse(
        201, 
        response, 
        isSubscribed === null ? "subscribed successfully" : "unsubscribed successfully"
    ))
})


const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!isValidObjectId(channelId)) throw new ApiError(401, "Invalid channel id");

    const user = await User?.findById(req.user?._id, {_id: 1});
    if(!user) throw new ApiError(404, "user not found");

    const pipeline = [
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subbscriber",
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
            $addFields: {
                subscriber: {
                    $first: "$subscriber"
                }
            }
        },
    ]

    try {
        const subscribers = await Subscription.aggregate(pipeline);
        const subscribersList = subscribers.map(item => item.subscriber)
        return res.status(200)
            .json(
                new ApiResponse(
                    200,
                    subscribersList,
                    "Subscribers List fetched successfully"
                )

            )

    } catch (error) {
        console.log("getUserSubscribedChannels error ::", error)
        throw new ApiError(
            500,
            error?.message || "Internal server error in getUserSubscribedChannels"
        )
    }

})


const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if(!isValidObjectId(subscriberId)) throw new ApiError(401, "Invalid Subscriber id");
    if(!req.user?._id) throw new ApiError(401, "Unauthorized error");

    const pipeline = [
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedTo",
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
            $unwind: "$subscribedTo"
        },
        {
            $project: {
                getSubscribedChannels: "$subscribedTo"
            }
        }
    ]

    try {
        const channelSubscribedTo = await Subscription.aggregate(pipeline);
        const channelsSubscribedBYOwner = channelSubscribedTo.map(item => item.getSubscribedChannels);

        return res.status(200).json(new ApiResponse(
            201, 
            channelsSubscribedBYOwner,
            "channels Subscribed by owner fetched Successfully!"
        ))
    } catch (error) {
        console.log("get Subscribed channel by owner ::", error);
        throw new ApiError(500, error?.message || "Internal subscriber error in getSubscribedChannelByOwner")
    }
    

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}