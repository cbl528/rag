/**
 * Cloudflare Pages Function — API 代理
 *
 * 将所有 /api/* 请求转发到后端服务器 http://124.221.110.104:8000/
 * 支持 SSE (Server-Sent Events) 流式响应
 */
export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  // 构造后端 URL，保留原始路径和查询参数（含 Authorization token）
  const backendUrl = `http://124.221.110.104:8000${url.pathname}${url.search}`

  // 转发请求到后端（保留方法、请求头、请求体）
  const backendRequest = new Request(backendUrl, {
    method: request.method,
    headers: request.headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  })

  // 获取后端响应（支持流式，如 SSE text/event-stream）
  const response = await fetch(backendRequest)

  // 透传响应流和状态
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
