package com.caobolun.business.common.enums;

public enum UserRole {
      ADMIN("admin"),
      USER("user");

      private final String code;

      UserRole(String code) {
          this.code = code;
      }

      public String getCode() {
          return code;
      }
  }