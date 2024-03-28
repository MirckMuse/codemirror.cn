---
layout: home
pageClass: limited-width-page
---

<script lang="ts" setup>
import HomeFeature from "../components/HomeFeature.vue"
import { ExampleBasic, ExampleLanguage, ExampleProgrammingInterface, ExampleIntegration } from "../config"
</script>

# 案例

你可以在这里找到一些关于 CodeMirror 的描述，一般会包含代码，会以推荐的方式使用该库来做一些事情。

## 基础

<ul class="grid-list">
  <li v-for="doc in ExampleBasic" :key="doc.title">
    <HomeFeature :feature="doc"></HomeFeature>
  </li>  
</ul>

## 语言

<ul class="grid-list">
  <li v-for="doc in ExampleLanguage" :key="doc.title">
    <HomeFeature :feature="doc"></HomeFeature>
  </li>  
</ul>

## 程序接口

<ul class="grid-list">
  <li v-for="doc in ExampleProgrammingInterface" :key="doc.title">
    <HomeFeature :feature="doc"></HomeFeature>
  </li>  
</ul>

## 集成

<ul class="grid-list">
  <li v-for="doc in ExampleIntegration" :key="doc.title">
    <HomeFeature :feature="doc"></HomeFeature>
  </li> 
</ul>
