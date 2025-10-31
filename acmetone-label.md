acmetone-label 项目


是acmetone的厂牌端

兼顾音乐人端

音乐人可以投稿入驻到acmetone极音记的厂牌
音乐人注册成功后 需要完善自己的实名信息（acmetone-backend 主后端进行实名）再完善自己的音乐平台链接（在acmetone-label-backend）。
投稿的时候可以上传mp3（后端自行压缩大小 限制在3MB以下）。

厂牌可以审核音乐人的投稿，审核通过后，就可以进入厂牌的待发行歌曲池子。

厂牌可以调用acmetone-backend的API端点接口，创建待发行专辑 数据同时存在acmetone-backend和acmetone-label-backend，acmetone-backend用于发行专辑的流程，acmetone-label-backend用于管理厂牌专辑数据。

厂牌在acmetone-label-frontend前端 可以获取厂牌的待发行专辑池子，可以将待发行曲子加入到待发行专辑。

厂牌可以调用acmetone-backend的API端点接口，可以提交专辑审核（数据字段应该加入一个厂牌端标识 这样获取音乐人实名通过acmetone-backend的API端点接口获取 音乐平台链接是通过acmetone-label-backend的API端点接口获取）。


acmetone主站管理员进行专辑审核后 专辑审核数据会同步到acmetone-label-backend。


厂牌可以进行编辑专辑，编辑专辑后，专辑数据会同步到acmetone-backend。

厂牌可以加入自己的展示页面 可以自定义 通过Markdown来编辑（可以加入背景图等等设计） 不过 我们设计的展示页面是 每一页都可以设计markdown 然后每一页是撑满页面的 然后切换页是通过鼠标滚轮来的 滚轮滚多久 可以切换到下一页。

然后厂牌还可以发布专有的征稿活动，用户投稿可以选择投稿到厂牌的征稿活动。