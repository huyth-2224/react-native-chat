// import "react-native-get-random-values"; // Necessary for UUID generation
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GiftedChat,
  Bubble,
  Send,
  InputToolbar,
  Time,
} from "react-native-gifted-chat";
import { auth, database, uploadToFirebase } from "../config/firebase";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { colors } from "../config/constants";
import EmojiModal from "react-native-emoji-modal";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import uuid from "react-native-uuid";
import { Image } from "expo-image"; // Import from expo-image
import ImageViewing from "react-native-image-viewing";

function Chat({ route }) {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [modal, setModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [visible, setVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(database, "chats", route.params.id),
      (doc) => {
        setMessages(
          doc.data().messages.map((message) => ({
            ...message,
            createdAt: message.createdAt.toDate(),
            image: message.image ?? "",
          }))
        );
      }
    );

    return () => unsubscribe();
  }, [route.params.id]);

  const onSend = useCallback(
    async (m = []) => {
      const chatDocRef = doc(database, "chats", route.params.id);
      const chatDocSnap = await getDoc(chatDocRef);

      const chatData = chatDocSnap.data();
      const data = chatData.messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toDate(),
        image: message.image ?? "",
      }));

      const messagesWillSend = [{ ...m[0], sent: true, received: false }];
      let chatMessages = GiftedChat.append(data, messagesWillSend);

      setDoc(
        doc(database, "chats", route.params.id),
        {
          messages: chatMessages,
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    },
    [route.params.id, messages]
  );

  // const pickImage = async () => {
  //   let result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //     allowsEditing: true,
  //     quality: 1,
  //   });

  //   if (!result.canceled) {
  //     uploadImage(result.assets[0].uri);
  //   }
  // };

  const pickImage = () => {
    ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    })
      .then((result) => {
        if (!result.canceled) {
          uploadImage(result.assets[0].uri);
        }
      })
      .catch((error) => {
        console.error("Image picking failed:", error);
      });
  };

  // const uploadImageAsync = async (uri) => {
  //   const blob = await new Promise((resolve, reject) => {
  //     const xhr = new XMLHttpRequest();
  //     xhr.onload = () => resolve(xhr.response);
  //     xhr.onerror = () => reject(new TypeError("Network request failed"));
  //     xhr.responseType = "blob";
  //     xhr.open("GET", uri, true);
  //     xhr.send(null);
  //   });
  //   const randomString = uuid.v4();
  //   const fileRef = ref(getStorage(), randomString);
  //   await uploadBytes(fileRef, blob);
  //   blob.close();

  //   const uploadedFileString = await getDownloadURL(fileRef);
  //   onSend([
  //     {
  //       _id: randomString,
  //       createdAt: new Date(),
  //       text: "",
  //       image: uploadedFileString,
  //       user: {
  //         _id: auth?.currentUser?.email,
  //         name: auth?.currentUser?.displayName,
  //         avatar: "https://i.pravatar.cc/300",
  //       },
  //     },
  //   ]);
  // };

  const uploadImage = async (uri) => {
    setUploading(true);
    const randomString = uuid.v4(); //uri.split("/").pop();
    const uploadResp = await uploadToFirebase(uri, randomString, (v) =>
      console.log(v)
    ).catch((v) => {
      setUploading(false);
      Alert.alert("Error", "Upload Error");
    });

    setUploading(false);
    onSend([
      {
        _id: randomString,
        createdAt: new Date(),
        text: "",
        image: uploadResp.downloadUrl,
        user: {
          _id: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          avatar: "https://i.pravatar.cc/300",
        },
      },
    ]);

    console.log(uploadResp);

    // setUploading(true);
    // const randomString = uuid.v4();
    // console.log("--- ranđom", randomString);
    // const fileRef = ref(storage, randomString);

    // fetch(uri)
    //   .then((response) => {
    //     if (!response.ok) {
    //       throw new Error("Network response was not ok");
    //     }
    //     return response.blob();
    //   })
    //   .then((blob) => {
    //     console.log("====? 111", fileRef);
    //     return uploadBytes(fileRef, blob)
    //       .then(() => {
    //         console.log("====? 1122");
    //         try {
    //           console.log("====? 11133");
    //           blob.close(); // Close the blob to free up memory
    //         } catch (error) {
    //           setUploading(false);
    //           console.error("Error closing blob:", error);
    //         }
    //         return getDownloadURL(fileRef);
    //       })
    //       .catch((error) => {
    //         console.log("---> crash app", error);
    //       });
    //   })
    //   .then((uploadedFileString) => {
    //     setUploading(false);
    //     onSend([
    //       {
    //         _id: randomString,
    //         createdAt: new Date(),
    //         text: "",
    //         image: uploadedFileString,
    //         user: {
    //           _id: auth?.currentUser?.email,
    //           name: auth?.currentUser?.displayName,
    //           avatar: "https://i.pravatar.cc/300",
    //         },
    //       },
    //     ]);
    //   })
    //   .catch((error) => {
    //     setUploading(false);
    //     console.error("Upload failed:", error);
    //   });

    // setUploading(true);
    // const randomString = uuid.v4();
    // const xhrPromise = new Promise((resolve, reject) => {
    //   const xhr = new XMLHttpRequest();
    //   xhr.onload = () => resolve(xhr.response);
    //   xhr.onerror = () => reject(new TypeError("Network request failed"));
    //   xhr.responseType = "blob";
    //   xhr.open("GET", uri, true);
    //   xhr.send(null);
    // });

    // xhrPromise
    //   .then((blob) => {
    //     const fileRef = ref(getStorage(), randomString);
    //     return uploadBytes(fileRef, blob).then(() => {
    //       try {
    //         blob.close(); // Try/catch to prevent crashes
    //       } catch (error) {
    //         setUploading(false);
    //         console.error("Error closing blob:", error);
    //       }
    //       return getDownloadURL(fileRef);
    //     });
    //   })
    //   .then((uploadedFileString) => {
    //     setUploading(false);
    //     onSend([
    //       {
    //         _id: randomString,
    //         createdAt: new Date(),
    //         text: "",
    //         image: uploadedFileString,
    //         user: {
    //           _id: auth?.currentUser?.email,
    //           name: auth?.currentUser?.displayName,
    //           avatar: "https://i.pravatar.cc/300",
    //         },
    //       },
    //     ]);
    //   })
    //   .catch((error) => {
    //     setUploading(false);
    //     console.error("Upload failed:", error);
    //   });
  };

  const renderBubble = useMemo(
    () => (props) =>
      (
        <Bubble
          {...props}
          wrapperStyle={{
            right: {
              backgroundColor: colors.greyWhisper,
            },
            left: {
              backgroundColor: colors.white,
              borderColor: colors.greyWhisper,
              borderWidth: 1,
            },
          }}
          textStyle={{
            left: {
              color: colors.lightBlack,
              fontSize: 14,
            },
            right: {
              color: colors.lightBlack,
              fontSize: 14,
            },
          }}
        />
      ),
    []
  );

  const renderSend = useMemo(
    () => (props) =>
      (
        <>
          <TouchableOpacity style={styles.addImageIcon} onPress={pickImage}>
            <View>
              <Ionicons name="attach-outline" size={32} color={colors.teal} />
            </View>
          </TouchableOpacity>
          <Send {...props}>
            <View
              style={{
                justifyContent: "center",
                height: "100%",
                marginLeft: 8,
                marginRight: 4,
                marginTop: 12,
              }}
            >
              <Ionicons name="send" size={24} color={colors.teal} />
            </View>
          </Send>
        </>
      ),
    []
  );

  const renderInputToolbar = useMemo(
    () => (props) =>
      (
        <InputToolbar
          {...props}
          containerStyle={styles.inputToolbar}
          renderActions={renderActions}
        />
      ),
    []
  );

  const renderActions = useMemo(
    () => () =>
      (
        <TouchableOpacity style={styles.emojiIcon} onPress={handleEmojiPanel}>
          <View>
            <Ionicons name="happy-outline" size={32} color={colors.teal} />
          </View>
        </TouchableOpacity>
      ),
    [modal]
  );

  const handleEmojiPanel = useCallback(() => {
    if (modal) {
      setModal(false);
    } else {
      Keyboard.dismiss();
      setModal(true);
    }
  }, [modal]);

  const renderLoading = useMemo(
    () => () =>
      (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ),
    []
  );

  const renderLoadingUpload = useMemo(
    () => () =>
      (
        <View style={styles.loadingContainerUpload}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ),
    []
  );

  // Function to handle image click
  const onImagePress = (imageUri) => {
    setSelectedImage([{ uri: imageUri }]);
    setVisible(true);
  };

  // Custom renderer for message images
  const renderMessageImage = (props) => {
    const { currentMessage } = props;

    return (
      <TouchableOpacity
        onPress={() => onImagePress(props.currentMessage.image)}
      >
        <Image
          style={{
            width: 180, // Width 180
            height: 180, // Height 180
            borderRadius: 10, // Rounded corners with 16px radius
            marginLeft: 10,
            marginRight: 10,
            marginTop: 10,
          }} // Adjust dimensions as needed
          source={currentMessage.image}
          cachePolicy="memory-disk" // Use caching
        />
      </TouchableOpacity>
    );
  };

  return (
    <>
      {uploading && renderLoadingUpload()}
      <GiftedChat
        messages={messages}
        showAvatarForEveryMessage={false}
        showUserAvatar={false}
        onSend={(messages) => onSend(messages)}
        imageStyle={{ height: 212, width: 212 }}
        messagesContainerStyle={{ backgroundColor: "#fff" }}
        textInputStyle={{ backgroundColor: "#fff", borderRadius: 20 }}
        user={{
          _id: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          avatar: "https://i.pravatar.cc/300",
        }}
        renderBubble={renderBubble}
        renderSend={renderSend}
        renderUsernameOnMessage={true}
        renderAvatarOnTop={true}
        renderInputToolbar={renderInputToolbar}
        renderMessageImage={renderMessageImage} // Use FastImage for caching
        renderTime={(props) => {
          return (
            <Text
              style={{
                color: colors.lightGrey, // Change color based on sender
                fontSize: 12, // Customize font size
                paddingTop: 5,
                paddingBottom: 5,
              }}
            >
              {"   "}
              {props.currentMessage.createdAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}{" "}
            </Text>
          );
        }}
        renderTicks={(props) => {
          return (
            <Text
              style={{
                color: colors.accentBlue, // Invisible if not sent/received/read
                fontSize: 12,
                paddingTop: 5,
                paddingBottom: 5,
              }}
            >
              ✓{"  "}
            </Text>
          );
        }}
        minInputToolbarHeight={56}
        scrollToBottom={true}
        onPressActionButton={handleEmojiPanel}
        scrollToBottomStyle={styles.scrollToBottomStyle}
        renderLoading={renderLoading}
      />

      {/* Image viewer for zooming */}
      <ImageViewing
        images={selectedImage || []}
        imageIndex={0}
        visible={visible}
        onRequestClose={() => setVisible(false)} // Close viewer on request
      />

      {modal && (
        <EmojiModal
          onPressOutside={handleEmojiPanel}
          modalStyle={styles.emojiModal}
          containerStyle={styles.emojiContainerModal}
          backgroundStyle={styles.emojiBackgroundModal}
          columns={5}
          emojiSize={66}
          activeShortcutColor={colors.primary}
          onEmojiSelected={(emoji) => {
            onSend([
              {
                _id: uuid.v4(),
                createdAt: new Date(),
                text: emoji,
                user: {
                  _id: auth?.currentUser?.email,
                  name: auth?.currentUser?.displayName,
                  avatar: "https://i.pravatar.cc/300",
                },
              },
            ]);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  inputToolbar: {
    bottom: 6,
    marginLeft: 8,
    marginRight: 8,
    borderRadius: 16,
  },
  emojiIcon: {
    marginLeft: 4,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  emojiModal: {},
  emojiContainerModal: {
    height: 348,
    width: 396,
  },
  emojiBackgroundModal: {},
  scrollToBottomStyle: {
    borderColor: colors.grey,
    borderWidth: 1,
    width: 56,
    height: 56,
    borderRadius: 28,
    position: "absolute",
    bottom: 12,
    right: 12,
  },
  addImageIcon: {
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainerUpload: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
    zIndex: 999, // Ensures it's above other elements
  },
});

export default Chat;
