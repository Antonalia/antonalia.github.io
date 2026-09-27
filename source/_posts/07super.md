---
description: "介绍子类访问父类的方法"
title: Python中super()函数的应用
excerpt: 介绍子类访问父类的方法
date: 
tags:
- python
- python语法
categories:
- Python学习
math: false
typora-root-url: ./..
---
## 类的分类:经典类和新式类
在py2中有经典类和新式类的区别：
新式类：继承了object类的子类，以及该子类的子类，子子类
经典类：没有继承object类的子类，以及该子类的子类，子子类
```python
#python2中
class Father:
    pass     # 经典类
class Father(object):
    pass     # 新式类
```
==注意：在py3中没有继承任何类，默认继承object类，所以python3中**都是新式类**==


## 子类调用父类的三种方法
- 父类名.方法名(self)
- super(子类名，self).父类方法名()
- super().父类方法名

## 多类继承-菱形结构
若子类继承于多个类，如Child继承于Mother和Father，Mother和Father继承于object类时就会组成一个菱形关系。若子类调用的方法在父类中重名时，根据mro列表的顺序先输出mro列表左边类的方法。
`类名.__base__`：查找类的父类
`类名.__mro__`  ：查找类的继承顺序
```python
class Mother(object):
    def speak(self):
        print("I'm your mother!")

class Father(object):
    def speak(self):
        print("I'm your father!")

class Child(Mother, Father):
    def say(self):
        # 方式一
        # (单和多继承 都适用)
        Father.speak(self)

        # 方式二
        # super默认会调用第一个父类的方法(适用于单继承 或者只想使用第一个父类的方法)
        # 格式: super(子类类名, self).父类方法名()
        super(Child, self).speak()

        # 方式三 
        # (适用于新式类) 02方式的简写
        super().speak()

I = Child() # 实例化
print(Child.__base__) # 查找Child的父类
print(Child.__mro__) # Child的继承顺序
print("----------------")
I.say()
print("----------------")
I.speak() # 根据Child类在mro列表中的位置可知父类是Mother
```
输出结果：
```python
<class '__main__.Mother'>
(<class '__main__.Child'>, <class '__main__.Mother'>, <class '__main__.Father'>, <class 'object'>)
----------------
I'm your father!
I'm your mother!
I'm your mother!
----------------
I'm your mother!
```



## 参考
1、[python 继承（史上最详细版本）](https://blog.csdn.net/pythondby/article/details/121758141)