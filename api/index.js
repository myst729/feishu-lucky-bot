const axios = require('axios')
const express = require('express')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// Fisher-Yates 算法
const pick = (list = [], n = 1) => {
  let i = list.length, j, temp
  if (i > 1) {
    while (--i) {
      j = Math.floor(Math.random() * (i + 1))
      temp = list[i]
      list[i] = list[j]
      list[j] = temp
    }
  }
  return list.slice(0, n)
}

// 获取 tenant access token
const fetchToken = async () => {
  const { data } = await axios({
    method: 'post',
    url: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    data: {
      app_id: '{{FEISHU_APP_ID}}',
      app_secret: '{{FEISHU_APP_SECRET}}',
    }
  })
  if (data.msg === 'ok') {
    return data.tenant_access_token
  }
}

// 获取飞书群成员列表
const fetchUserIds = async (token, groupId) => {
  const { data } = await axios({
    method: 'get',
    url: `https://open.feishu.cn/open-apis/im/v1/chats/${groupId}/members`,
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    data: {
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    },
  })
  if (data.msg === 'success') {
    return data.data.items.map(m => m.member_id)
  }
}

// 发送飞书群消息
const sendMessage = async (token, groupId, userIds) => {
  const message = userIds?.length
    ? `恭喜幸运儿 ${userIds.map(uid => `<at user_id="${uid}"></at>`).join(' ')} [撒花]`
    : '发送幸运数字挑选指定数量的幸运儿，或直接@我选出一位 [呲牙]'
  const { data } = await axios({
    method: 'post',
    url: 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    data: {
      receive_id: groupId,
      msg_type: 'text',
      content: JSON.stringify({ text: message }),
    },
  })
}

app.post('/', async (req, res) => {
  res.status(200).send(JSON.stringify(req.body))
})

app.get('/', async (req, res) => {
  try {
    const { group, count, help } = req.query
    if (!group) {
      throw new Error('INVALID')
    }

    const num = Number(count) || 1
    const token = await fetchToken()

    if (help === undefined) {
      const userIds = await fetchUserIds(token, group)
      const luckyIds = pick(userIds, num)
      await sendMessage(token, group, luckyIds)
    } else {
      await sendMessage(token, group)
    }
    res.status(200).send('hello\n')
  } catch (error) {
    res.status(200).send('hello\n')
  }
})

app.listen(3000, () => console.log('Server ready on port 3000.'))
module.exports = app
