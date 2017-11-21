'use strict';

const express = require('express');
// 解析post请求体的数据
const bodyParser = require('body-parser');

// 文件增强
const fse = require('fs-extra');
// 解析文件上传的包
const formidable = require('formidable');
// 引入path核心对象
const path = require('path');

// 引入数据库对象
const mysql = require('mysql');

const pool = mysql.createPool({
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'root',
    password: '123',
    database: 'album'
});

// 创建服务器
let app = express();

// 配置模板引擎

app.engine('html', require('express-art-template'));

// 配置路由规则
let router = express.Router();
// 测试路由
router.get('/test', (req, res, next) => {
    pool.getConnection(function (err, connection) {
        connection.query('SELECT * FROM album_dir', function (error, results, fields) {
            // 查询完毕后，释放连接
            connection.release();
            if (err) throw error;
            res.render('test.html', {
                text: results[2].dir
            });
        });
    });
})
// 渲染相册列表
router.get('/', (req, res, next) => {
    pool.getConnection(function (err, connection) {
        connection.query('SELECT * FROM album_dir', function (error, results, fields) {
            // console.log(results);
            // [  { dir: 'aaa' },
            //  { dir: 'vvv' },
            // { dir: 'vvvb' } ]
            // 查询完毕后，释放连接
            connection.release();
            if (err) throw error;
            res.render('index.html', {
                album: results
            });
        });
    });
})
    // 显示照片列表
    .get('/showDir', (req, res, next) => {
        // 获取url上的查询字符串
        let dirname = req.query.dir;
        // console.log(dirname);返回值是？参数的值
        // 建立链接，查询数据库数据
        pool.getConnection((err, connection) => {
            if (err) return next(err);
            // 上述是为了处理获取连接时的异常，比如停网
            // 现在连接成功，开始查询所有album_dir的数据
            connection.query('select * from album_file where dir =?', [dirname], (err, results) => {
                // 查询完毕后，释放连接
                connection.release();
                // 如果出现错误，直接跳到错误处理中间件
                if (err) return next(err);
                // 记录相册名
                // console.log(results);
                res.render('album.html', {
                    album: results,
                    dir: dirname,
                });
            })
        })
    })
    // 添加目录

    .post('/addDir', (req, res, next) => {
        let dirname = req.body.dirname;
        // console.log(dirname);
        pool.getConnection((err, connection) => {
            if (err) return next(err);
            // 查询数据库
            connection.query('insert into album_dir values (?)', [dirname], (error, results) => {
                if (err) return next(err);
                res.redirect('/showDir?dir=' + dirname);
            })
        })
    })

    // 添加照片
    .post('/addPic', (req, res, next) => {
        var form = new formidable.IncomingForm();

        let rootPath = path.join(__dirname, 'resource');
        // console.log(rootPath);
        // F:\jiuyeban\node\day04\code\01_album\resource
        console.log(form.uploadDir);
        // 设置默认form.uploadDir
        form.parse(req, function (err, fields, files) {
            if (err) return next(err);
            //console.log(fields);//{ dir: 'deasfs' }
            //console.log(files);//{pic:{ path: 'C:\\Users\\ADMINI~1\\AppData\\Local\\Temp\\upload_8deba54274182d11a1e1094a38e7e6c4',}}
            // console.log(path.parse(files.pic.path).base);
            let filename = path.parse(files.pic.path).base;
            // 要移动到的目标路径
            let dist = path.join(rootPath, fields.dir, filename)
            fse.move(files.pic.path, dist, (err) => {
                if (err) return next(err);

                // console.log('移动成功');
                let db_file = `/resource/${fields.dir}/${filename}`;
                let db_dir = fields.dir;

                pool.getConnection((err, connection) => {
                    if (err) return next(err);
                    connection.query('insert into album_file values (?,?)', [db_file, db_dir], (error, results) => {
                        console.log(results);
                        //查询完毕以后，释放连接
                        connection.release();
                        //处理查询时带来的异常，比如表名错误
                        if (err) return next(err);
                        //重定向到看相片的页面
                        res.redirect('/showDir?dir=' + db_dir);
                    })
                })
            })
        })
    })

app.use('/public', express.static('./public'));
app.use('/resource', express.static('./resource'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());
// 中间件执行列表
app.use(router);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.log('出错了。------------------------');
    console.log(err);
    console.log('出错啦。---------------------');
    res.send(`您要访问的页面出异常...请稍后再试
        <a href="/">去首页玩</a>
    `)
})
// 开启服务器
app.listen(8888, () => {
    console.log('服务器启动了');
});

