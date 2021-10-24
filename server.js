const cors = require('cors');
const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()
const server = require('http').Server(app)
const fs = require('fs');
const HTTPS = require('https');
// const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const url = require('url');
const path=require('path');

//try {
  const option = {
    ca: fs.readFileSync('/etc/letsencrypt/live/mima.miraclemind.kro.kr/fullchain.pem'),
    key: fs.readFileSync(path.resolve(process.cwd(), '/etc/letsencrypt/live/mima.miraclemind.kro.kr/privkey.pem'), 'utf8').toString(),
    cert: fs.readFileSync(path.resolve(process.cwd(), '/etc/letsencrypt/live/mima.miraclemind.kro.kr/cert.pem'), 'utf8').toString(),
  };

 const httpsServer= HTTPS.createServer(option, app).listen(443, () => {
    console.log(`[HTTPS] Server is started on port ${443}`);
  });
  
//} catch (error) {
  console.error('[HTTPS] HTTPS 오류가 발생하였습니다. HTTPS 서버는 실행되지 않습니다.');
  console.error(error);
//}
const io = require('socket.io')(httpsServer);

//오라클 접속
var oracledb = require('oracledb');
var dbConfig = require('./config/dbConfig');
//oracle auto commit
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OBJECT;
var conn;

let dbConnection =function(){
  oracledb.getConnection({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString
  },function(err,connection){
      if(err){
          console.log("접속이 실패했습니다.",err);
      }
      console.log('connected');
      conn = connection;
  });//오라클연결 끝
}

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors({origin: '*'}));
app.use('/peerjs', peerServer);

app.all(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://mima.miraclemind.kro.kr:8080/");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
    next();
});

dbConnection();

var userRole="";
//로컬호스트3000번으로 가면 uuidV4로 진료방 uid를 만들어서 redirect 해줌
app.get('/', (req, res) => {
  const bookingNo = req.query.bookingNo;
  const roomId = `${uuidV4()}`;
  res.redirect(
    url.format({
      pathname: `/${roomId}`,
      //이렇게 말고 setAttribute 같이 보내는게 있음 좋을텐데 ㅠㅠ 이럼 보안이....
      query: {
        roomId: roomId,
        bookingNo:bookingNo
      }
    })
  );
})


// //진료방으로 들어오면 roomId를 파라미터로 보내줌
app.get('/:room', (req, res) => {
 
  var roomId = req.query.roomId;
  var bookingNo = req.query.bookingNo;
  userRole=req.cookies.userRole;
  
  //쿠키정보를 가지고와서 role이 의사면 쿼리입력
  if(userRole == "doctor"){
      console.log("의사입장");
      //예약 테이블에 방의 고유 아이디를 업데이트
    var sql = `update booking set room_id='${roomId}' where booking_no=${bookingNo}`;
    
    conn.execute(sql, function(err,result){
            if(err){
                console.log("등록중 에러가 발생했어요!!", err);
                doRelease(conn);
                return;
            }
              console.log("result : ", result);
              console.log("_____방아이디 인서트 완료______");
        });
    conn.close(function (err) {
      console.log("db disconnected");
      if (err) {
        console.error('connection ended due to the error', err.message);
      }
    });
        
        res.render('room', { 
          roomId: req.query.roomId,
          bookingNo: req.query.bookingNo,        
        })
      }
      // end of if role == doctor
else if(userRole == "pt"){
    console.log("환자가 방에 들어왔습니다. ")
    res.render('room', { 
      roomId: req.query.roomId,
      bookingNo: req.query.bookingNo
    })
  }
})//end of 진료방+환자정보 쿼리


//환자정보 조회를 누르면 ajax로 조회

//진료기록 입력을 누르면 ajax로 입력
app.post('/ajax', function (req, res){
  var input = req.body;

  let today = new Date();   
  let year = today.getFullYear(); // 년도
  let month = today.getMonth() + 1;  // 월
  let date = today.getDate();  // 날짜
  let consult_date=year+'/'+month+'/'+date;
  console.log(consult_date);
 
  //https://stackoverflow.com/questions/33475160/node-js-form-sumit-using-ajax 참고
  dbConnection();
  var sql =`insert into consultation(
    CONSULT_DATE,
    PT_ASSESSMENT,
    PT_DIAGNOSIS,
    PT_SYMPTOM,
    BOOKING_NO,
    PT_NO,
    DOC_NO
    ) values(
      TO_DATE(:CONSULT_DATE, 'yyyy/mm/dd'),
      :PT_ASSESSMENT,
      :PT_DIAGNOSIS,
      :PT_SYMPTOM,
      :BOOKING_NO,
      :PT_NO,
      :DOC_NO
    )`;

   conn.execute(
     sql, [consult_date, input.pt_assessment, input.pt_diagnosis, input.pt_symptom, Number(input.booking_no),  Number(input.pt_no),  Number(input.doc_no)]
    , function(err, rows){
      if (err){
        console.log("Error 진료기록 inserting : %s ",err );
        doRelease(conn);
        return;
      }
      res.send({'success' : true, 'message' : 'Added Successfully'});
  });
  doRelease(conn);
 
});//진료기록 인서트 끝



//환자 정보 조회 버튼 누르면 새 윈도우를 띄워줌
app.get('/searchPt', (req, res) => {
  console.log("search pt page");
  res.writeHead(200, {'content-type':'text/html'});
  res.write(ptInformationPage);
  res.end();
  // res.render('searchPt');
})

const ptRouter = require('./routes/ptInfo');
const { response } = require('express')
app.use('ptInfo', ptRouter);


io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)

  // // messages
  //   socket.on('message', (message) => {
  //     //send message to the same room
  //     io.to(roomId).emit('createMessage', message)
  // }); 

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})


//db 연걸 끊는 함수
function doRelease(conn) {
  conn.close(function (err) {
    console.log("db disconnected");
    if (err) {
      console.error('connection ended due to the error', err.message);
    }
  });
  }////db 연걸 끊는 함수 끝

  server.listen(3000);

