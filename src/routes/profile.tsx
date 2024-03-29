import styled from "styled-components"
import { auth, db, storage } from "./firebase"
import { useEffect, useState } from "react"
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { Unsubscribe, updateProfile } from "firebase/auth"
import { Error } from "../components/auth-styled"
import { DocumentData, QuerySnapshot, collection, doc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore"
import { ITweet } from "../components/timeline"
import Tweet from "../components/tweet"

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 20px;
`
const AvatarUpload = styled.label`
  width: 80px;
  overflow: hidden;
  height: 80px;
  border-radius: 50%;
  background-color: #1d9bf0;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  svg {
    width: 50px;
  }
`
const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`
const AvatarInput = styled.input`
  display: none;
`
const Name = styled.span`
  width: 170px;
  padding: 5px 0px;
  font-size: 18px;
  height: 32px;
  text-align: center;
`
const DefaultAvatarBtn = styled.label`
  width: 30%;
  padding: 10px 0px;
  color: #1d9bf0;
  text-align: center;
  border-radius: 20px;
  border: 1px solid #1d9bf0;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  &:hover,
  &:active {
    opacity: 0.9;
  }
`
const Tweets = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: scroll;
`

const EditNickButton = styled.button`
  background-color: black;
  float: left;
  color: tomato;
  font-weight: 600;
  font-size: 12px;
  padding: 5px 10px;
  text-transform: uppercase;
  border-radius: 5px;
  border: 1px solid tomato;
  cursor: pointer;
  &:hover,
  &:active {
    opacity: 0.9;
  }
`
export const Input = styled.input`
  width: 170px;
  background-color: black;
  border: 1px solid white;
  color: white;
  text-align: center;
  padding: 5px 0px;
  border-radius: 50px;
  font-size: 17px;
  &[type="submit"] {/* type이 submit이라면 */
    cursor: pointer; /* cursor pointer효과 */
    &:hover { /* hover되었다면 */
      opacity: 0.8; /* 투명도를 0.8로 지정 */
    }
  }
`

export default function Profile() {
  const user = auth.currentUser;
  const [avatar, setAvatar] = useState(user?.photoURL);
  const [error, setError] = useState("")
  const [tweets, setTweets] = useState<ITweet[]>([])
  const [nickname, setNickname] = useState<string|null|undefined>(user?.displayName)
  const [isNickEdit, setIsNickEdit] = useState(false)

  /**
   * 프로필/닉네임 수정시 해당 user에 대한 모든 게시글을 조회한다.
   * @returns 
   */
  const updateUserProfileArticleQuery = () => {
    return query(
      collection(db, "tweets"),
      where("userId", "==", user?.uid),
      orderBy("createdAt", "desc"),
      limit(25)
    )
  }

  const onAvatarChange = async (e:React.ChangeEvent<HTMLInputElement>) => {
    const {files} = e.target

    if(user && files && files.length === 1) {
      const file = files[0]
      const locationRef = ref(storage, `avatars/${user?.uid}`)
      const result = await uploadBytes(locationRef, file)
      const photoURL = await getDownloadURL(result.ref)

      setAvatar(photoURL)
      await updateProfile(user, {photoURL})

      const snapshot = await getDocs(updateUserProfileArticleQuery());
      snapshot.docs.forEach(document => {
        // const {id} = doc.data();
        const updateUserProfileDoc = doc(db, "tweets", document.id);
        updateDoc(updateUserProfileDoc, {avatar: photoURL})
      })
    }
  }

  /**
   * 내가 쓴 Tweet 조회
   * 콘솔 오류 출력 링크로 이동하여 색인을 저장한다.
   * 우리가 필터링에 사용한 필터들을 파이어베이스에 직접 알려줘야 한다.
   */
  /* const fetchTweet = async () => {

    const tweetQuery = query(
      collection(db, "tweets"),
      where("userId", "==", user?.uid),
      orderBy("createdAt", "desc"),
      limit(25)
    )
    const snapshot = await getDocs(tweetQuery);
    const tweets = snapshot.docs.map(doc => {
      const {tweet, createdAt, userId, username, photo} = doc.data();
      return {
        tweet,
        createdAt,
        userId,
        username,
        photo,
        docId: doc.id
      }
    })
    setTweets(tweets)
  } */

  const getTweets = (snapshot: QuerySnapshot<DocumentData>) => {
    return snapshot.docs.map(doc=>{
      const{avatar, photo, tweet, userId, username, createdAt} = doc.data();
        return {
          avatar,
          photo,
          tweet,
          userId,
          username,
          createdAt,
          docId: doc.id
        };
      })
  }
  useEffect(()=> {
    // fetchTweet();
    let unsubscribe: Unsubscribe|null = null;
    const fetchTweets = async () => {
      const tweetsQuery = query(
        collection(db, "tweets"), 
        orderBy("createdAt", "desc"), //createdAt 기준 내림차순
        where("userId", "==", user?.uid),
        limit(25) // 25개의 데이터만 가져와 비용을 절약한다.
      )

      unsubscribe = await onSnapshot(tweetsQuery, (snapshot) => {
        // snapshot으로부터  마지막 스냅샷 이후의 변경사항(크기, 쿼리, 메타데이터, 문서 등)을 볼 수 있다.
        // snapshot.docChanges // 변경사항 을 배열로 반환한다. (변경사항으로 작업을 분기처리할 수 있음..) 
        const tweets = getTweets(snapshot)
          setTweets(tweets)
      })
    }
    fetchTweets();
    return () => {
      unsubscribe && unsubscribe();
    }
  }, [])

  /**
   * 삭제 후 출력되는 메시지 3초후 제거
   */
  useEffect(()=>{
    if(error!="") {
      setTimeout(()=>{
        setError("")
      }, 3000)
    }
  }, [error])

  const onDefaultAvatar = async () => {
    if(avatar == null) {
      setError("Already Default Avartar.. you need Change Avatar..")
      return;
    }
    if(user) {
      setAvatar(null)
      const photoRef = ref(storage,  `avatars/${user?.uid}`)
      await deleteObject(photoRef)
      await updateProfile(user, {photoURL:""})
      const snapshot = await getDocs(updateUserProfileArticleQuery());
      
      snapshot.docs.forEach(document => {
        const updateUserProfileDoc = doc(db, "tweets", document.id);
        updateDoc(updateUserProfileDoc, {avatar: ""})
      })
    }
  }

  /**
   * 닉네임 변경
   * input 비/활 및 변경
   * @param e 
   */
  const onNickHandler = async(e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if(!isNickEdit) setIsNickEdit(!isNickEdit)
    else if(user && nickname != "" && nickname != user?.displayName){
      // 사용자 프로필이름 지정
        await updateProfile(user, {displayName: nickname,})
        
    }
    setIsNickEdit(!isNickEdit)

      const snapshot = await getDocs(updateUserProfileArticleQuery());
      snapshot.docs.forEach(document => {
        // const {id} = doc.data();
        const updateUserProfileDoc = doc(db, "tweets", document.id);
        updateDoc(updateUserProfileDoc, {username: nickname})
      })
  }

  const onNickChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value)
  }

  return <Wrapper>
    <AvatarUpload htmlFor="profile">
      {avatar? <AvatarImg src={avatar}/> : <DefaultAvatar/>}
    </AvatarUpload>
    <AvatarInput onChange={onAvatarChange} id="profile" type="file" accept="image/*"/>
    <DefaultAvatarBtn onClick={onDefaultAvatar}>Change Default Avartar</DefaultAvatarBtn>
    {error !== "" ? <Error>{error}</Error>: null}
    <div style={{display: "flex"}}>
    {isNickEdit ? 
    <Input onChange={onNickChange} value={nickname as string} placeholder={"변경할 닉네임 입력"} maxLength={15} minLength={1}/>
    :
    <Name>{user?.displayName ?? "Anonymous"}</Name>
    }
    <EditNickButton onClick={onNickHandler}>{isNickEdit ? "✏️ Submit" : "✏️ Edit"}</EditNickButton>
    </div>
    <Tweets>
      {tweets.map(tweet=> <Tweet key={tweet.docId} {...tweet}/>)}
    </Tweets>
  </Wrapper>
}
function DefaultAvatar() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
</svg>
}