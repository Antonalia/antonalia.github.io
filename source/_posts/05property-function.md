---
description: "property()把方法包装成属性，让那个方法以属性的形式被访问和调用，即将class.function()通过class.function进行引用，不需要()"
title: Python中property和@property的应用
excerpt: property()把方法包装成属性，让那个方法以属性的形式被访问和调用，即将class.function()通过class.function进行引用，不需要()
date: 
tags:
- python
- python语法
categories:
- Python学习
math: false
typora-root-url: ./..
---

## 前言
`property`把方法包装成属性，让那个方法以属性的形式被访问和调用，即将`class.function()`通过`class.function`进行引用，不需要()

## 1、property()函数
- 语法
  `property(fget=None, fset=None, fdel=None, doc=None) -> property attribute`
- 说明
  - `fget` 是获取属性值的方法
  - `fset` 是设置属性值的方法
  - `fdel` 是删除属性值的方法
  - `doc` 是属性描述信息。如果省略，会把 fget 方法的 docstring 拿来用（如果有的话）

```python
class Student:
    def __init__(self): 
        self._age = None

    def get_age(self): # 获取属性时执行的代码
        return self._age

    def set_age(self, age): # 设置属性时执行的代码
        self._age = age

    def del_age(self): # 删除属性时执行的代码
        del self._age

    age = property(get_age, set_age, del_age, '学生年龄')

student = Student()
# 用类名.属性.__doc__ 的形式查看属性的文档字符串,即property中的字符串注释
print('查看属性的文档字符串：' + Student.age.__doc__)
"""
输出：
查看属性的文档字符串：学生年龄
"""

# 设置属性
student.age = 18

# 获取属性
print('学生年龄为：' + str(student.age))
"""
输出：
学生年龄为：18
"""
# 删除属性
del student.age
print('学生年龄为：' + str(student.age))
"""
输出：
AttributeError: 'Student' object has no attribute '_age'
"""

```

## 2、@property装饰器
这是更为常用的方法
- 被 `@property `装饰的方法会被用做==属性名==。该条使用最为广泛。法加入@property后，这个方法相当于一个属性，这个属性可以让用户进行使用，并且在不设置`@属性名.setter`和`@属性名.deleter` 时用户==没有办法随意修改==。
- 被 `@属性名.setter` 装饰的方法是设置属性值的方法。
- 被 `@属性名.deleter` 装饰的方法是删除属性值的方法
```python  
class Student:
    def __init__(self):
        self._age = None

    @property
    def age(self):
        return self._age

    @age.setter
    def age(self, age):
        self._age = age

    @age.deleter
    def age(self):
        del self._age


student = Student()

# 设置属性
student.age = 18

# 获取属性，即调用时不需要student.age()
print('学生年龄为：' + str(student.age))
"""
输出
学生年龄为：18
"""

```
更一般的情况是：不设置`@属性名.setter` 和 `@属性名.deleter`，则用户进行属性调用的时候，直接调用age即可。同时用户不知道属性名_age，因此用户无法更改属性，从而保护了类的属性
```python  
class Student:
    def __init__(self):
        self._age = 20
    @property
    def age(self):
        return self._age


student = Student()

# 设置属性
student.age = 18
'''
报错：
property 'age' of 'Student' object has no setter
'''

# 获取属性，
print('学生年龄为：' + str(student.age))
"""
输出
学生年龄为：20
"""

#只有通过内部属性才能更改值，更加安全
student._age = 18
print('学生年龄为：' + str(student.age))
"""
输出
学生年龄为：18
"""

```

## 参考

1、[Python 中 property() 函数及 @property 装饰器的使用_python中的 property-CSDN博客](https://blog.csdn.net/jpch89/article/details/84026130)
2、[python @property的介绍与使用 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/64487092)

