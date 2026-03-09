import { Request, Response } from "express"
import axios from "axios"

class RobloxAPI {
  async request(url: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", data: any = null, timeout = 10000) {
    try {
      const config: any = { method, url, timeout }
      if (data) config.data = data
      const response = await axios(config)
      return response.data
    } catch {
      return null
    }
  }

  async getUserIdFromUsername(username: string) {
    const data = await this.request("https://users.roblox.com/v1/usernames/users", "POST", {
      usernames: [username],
      excludeBannedUsers: false,
    })
    return data?.data?.[0]?.id || null
  }

  async getUserInfo(userId: number) { return await this.request(`https://users.roblox.com/v1/users/${userId}`) }
  async getUserStatus(userId: number) { return await this.request(`https://users.roblox.com/v1/users/${userId}/status`) }
  async getUserPresence(userIds: number[]) { return await this.request("https://presence.roblox.com/v1/presence/users", "POST", { userIds }) }
  async getUserFriendsCount(userId: number) { return await this.request(`https://friends.roblox.com/v1/users/${userId}/friends/count`) }
  async getUserFollowersCount(userId: number) { return await this.request(`https://friends.roblox.com/v1/users/${userId}/followers/count`) }
  async getUserFollowingCount(userId: number) { return await this.request(`https://friends.roblox.com/v1/users/${userId}/followings/count`) }
  async getUserGroups(userId: number) { return await this.request(`https://groups.roblox.com/v1/users/${userId}/groups/roles`) }
  async getUserPrimaryGroup(userId: number) { return await this.request(`https://groups.roblox.com/v1/users/${userId}/groups/primary/role`) }
  async getUserFavoriteGames(userId: number, limit = 5) { return await this.request(`https://games.roblox.com/v2/users/${userId}/favorite/games?limit=${limit}`) }
  async getUserRecentGames(userId: number, limit = 5) { return await this.request(`https://games.roblox.com/v2/users/${userId}/games?limit=${limit}`) }
  async getUserAvatarHeadshot(userId: number) { return await this.request(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`) }
  async getUserAvatarFullBody(userId: number) { return await this.request(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`) }
  async getUserAvatarBust(userId: number) { return await this.request(`https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${userId}&size=420x420&format=Png&isCircular=false`) }
  async getUserAvatar(userId: number) { return await this.request(`https://avatar.roblox.com/v1/users/${userId}/avatar`) }
  async getUserCurrentlyWearing(userId: number) { return await this.request(`https://avatar.roblox.com/v1/users/${userId}/currently-wearing`) }
  async getUserOutfits(userId: number, page = 1, itemsPerPage = 10) { return await this.request(`https://avatar.roblox.com/v1/users/${userId}/outfits?page=${page}&itemsPerPage=${itemsPerPage}`) }
  async getUserBadges(userId: number, limit = 5) { return await this.request(`https://badges.roblox.com/v1/users/${userId}/badges?limit=${limit}`) }
  async getUserCollectibles(userId: number, limit = 5) { return await this.request(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=${limit}`) }
  async getUserRobloxBadges(userId: number) { return await this.request(`https://accountinformation.roblox.com/v1/users/${userId}/roblox-badges`) }
  async getUserBundles(userId: number, limit = 5) { return await this.request(`https://catalog.roblox.com/v1/users/${userId}/bundles?limit=${limit}`) }
  async validateMembership(userId: number) { return await this.request(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`) }

  async getCompleteUserInfo(username: string) {
    const userId = await this.getUserIdFromUsername(username)
    if (!userId) return null

    const [
      basic, status, presence, friends, followers, following,
      groups, primaryGroup, favoriteGames, recentGames,
      headshot, fullBody, bust, avatar, wearing, outfits,
      badges, collectibles, robloxBadges, bundles,
    ] = await Promise.all([
      this.getUserInfo(userId),
      this.getUserStatus(userId),
      this.getUserPresence([userId]),
      this.getUserFriendsCount(userId),
      this.getUserFollowersCount(userId),
      this.getUserFollowingCount(userId),
      this.getUserGroups(userId),
      this.getUserPrimaryGroup(userId),
      this.getUserFavoriteGames(userId),
      this.getUserRecentGames(userId),
      this.getUserAvatarHeadshot(userId),
      this.getUserAvatarFullBody(userId),
      this.getUserAvatarBust(userId),
      this.getUserAvatar(userId),
      this.getUserCurrentlyWearing(userId),
      this.getUserOutfits(userId),
      this.getUserBadges(userId),
      this.getUserCollectibles(userId),
      this.getUserRobloxBadges(userId),
      this.getUserBundles(userId),
    ])

    return {
      userId,
      basic,
      status,
      presence,
      social: { friends, followers, following },
      groups: { list: groups, primary: primaryGroup },
      games: { favorites: favoriteGames, recent: recentGames },
      avatar: { headshot, fullBody, bust, details: avatar, wearing, outfits },
      achievements: { badges, collectibles, robloxBadges },
      catalog: { bundles },
    }
  }
}

const Roblox = new RobloxAPI()

export default async function robloxHandler(req: Request, res: Response) {
  const username = req.query.username as string

  if (!username || username.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'username' wajib diisi" })
  }

  try {
    const data = await Roblox.getCompleteUserInfo(username.trim())
    if (!data) return res.status(404).json({ status: false, message: `User '${username}' tidak ditemukan di Roblox` })
    res.json({ status: true, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
