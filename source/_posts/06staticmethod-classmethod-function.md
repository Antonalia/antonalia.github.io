---
description: "介绍@staticmethod和@classmethod在函数中的应用"
title: Python中@staticmethod和@classmethod在函数中的应用
excerpt: 介绍@staticmethod和@classmethod在函数中的应用
date: 
tags:
- python
- python语法
categories:
- Python学习
math: false
typora-root-url: ./..
---

## @staticmethod：静态方法
该方法不需要访问任何实例方法和属性，纯粹地传入参数并返回数据。它节省了实例化对象的开销成本，往往这种方法放在类外面的模块层作为一个函数存在也是没问题的，而放在类中，仅为这个类服务。如下声明一个静态方法：

```python
class A(object):
    @staticmethod
	def f(arg1, arg2, ...):
        ...

    def f1(s):
        print('Hello! ' + s)
        
A.f1('Sam') # 不实例化使用方法

a = A() # 实例化使用方法
a.f1('John')
```
输出结果：
```python
Hello! Sam
Hello! John
```
以上实例声明了静态方法f1，从而可以实现==实例化调用== `A().f1()`，当然也可以==不实例化调用==该方法 `A.f1()`。

## @classmethod：类方法

第一个参数必须是`cls`
```python
class A(object):
    @classmethod
    def f2(cls,s):
        print('Hello! ' + s)
a = A()
a.f2('Sam')
A.f2('John')
```
输出结果：
```python
Hello! Sam
Hello! John
```
以上结果表明，不管是`a.f2`还是`A.f2`，都是对应的A类，绑定了类对象中的f2方法。因为python可以通过实例对象a找到它所属的类是A，找到A之后自动绑定到 `cls`。因此也可以在实例方法中通过`self.f2()`来调用类方法。
```python
def f0(self, s):
    print("self:", self)
    self.f2(s)
```
## 参考

1、[正确理解Python中的 @staticmethod@classmethod方法](https://zhuanlan.zhihu.com/p/28010894)