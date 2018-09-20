## Hexo Swagger

Document your Swagger Specification API by hexo, with support for [OpenAPI 3.0](https://swagger.io/specification/).
you can see example at [https://takumiao.github.io/hexo-swagger-site/](https://takumiao.github.io/hexo-swagger-site/)

## Install

```bash
$ npm install hexo-swagger --save
```

create `_swagger` folder in your source folder
```
.
├── _config.yml
├── package.json
├── scaffolds/
├── source
|   ├── _swagger <-- here
|   ├── _drafts
|   └── _posts
└── themes
```

## _swagger
First, you must create a project foler. And then 
create `components` `paths` folder and `index.oas3` file to it

```
.
├── PetStore
|   ├── components
|   ├── paths
|   └── index.oas3
└── YourOtherProject
```

### index.oas3
OpenAPI document file. You can define the below field of [Document](https://swagger.io/specification/#oasDocument) here.

- openapi
- info
- servers
- tags
- externalDocs

### paths
You should define each [Paths Object](https://swagger.io/specification/#pathsObject) by file in `paths` folder. 
```
.
├── pet
|   ├── {petId}
|   |   ├── index.oas3
|   |   └── uploadImage.oas3
|   ├── findByStatus.oas3
|   ├── findByTags.oas3
|   └── index.oas3
├── store
|   ├── order
|   |   ├── index.oas3
|   |   └── {orderId}.oas3
|   └── inventory.oas3
└── user
    ├── createWithArray.oas3
    ├── createWithList.oas
    ├── index.oas3
    └── ...
```

pathname of file is the key of paths object

```
pet/{petId}/index.oas3 -> '/pet/{petId}'
pet/{petId}/uploadImage.oas3 -> '/pet/{petId}/uploadImage'
store/order/index.oas3 -> '/store/order'
```

### components
You also should define each [Components Object](https://swagger.io/specification/#componentsObject) by file in `components` folder
```
.
├── requestBodies
|   ├── Pet.oas3
|   └── UserArray.oas3
├── schemas
|   ├── ApiResponse.oas3
|   ├── Category.oas3
|   ├── Order.oas3
|   ├── Pet.oas3
|   ├── Tag.oas3
|   └── User.oas3
└── securitySchemes.oas3
```