package com.caobolun.business.user.config;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.caobolun.framework.context.UserContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
   * 用户上下文拦截器
   * 每次请求前从 Sa-Token 中获取当前登录用户 ID 并设置到 UserContext
   */
  @Component
  public class UserContextInterceptor implements HandlerInterceptor {

      @Override
      public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
          // 预检请求放行
          if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
              return true;
          }

          try {
              String loginId = StpUtil.getLoginIdAsString();
              if (StrUtil.isNotBlank(loginId)) {
                  UserContext.setUserId(loginId);
              }
          } catch (Exception e) {
              // 未登录，UserContext 保持 null
          }
          return true;
      }

      @Override
      public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
          UserContext.clear();
      }
  }