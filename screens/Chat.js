// import "react-native-get-random-values"; // Necessary for UUID generation
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Text,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GiftedChat,
  Bubble,
  Send,
  InputToolbar,
} from "react-native-gifted-chat";
import { auth, database } from "../config/firebase";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { colors } from "../config/constants";
import EmojiModal from "react-native-emoji-modal";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import uuid from "react-native-uuid";

function Chat({ route }) {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [modal, setModal] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const uploadImage = (uri) => {
    setUploading(true);
    const randomString = uuid.v4();
    const xhrPromise = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError("Network request failed"));
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    xhrPromise
      .then((blob) => {
        const fileRef = ref(getStorage(), randomString);
        return uploadBytes(fileRef, blob).then(() => {
          try {
            blob.close(); // Try/catch to prevent crashes
          } catch (error) {
            setUploading(false);
            console.error("Error closing blob:", error);
          }
          return getDownloadURL(fileRef);
        });
      })
      .then((uploadedFileString) => {
        setUploading(false);
        onSend([
          {
            _id: randomString,
            createdAt: new Date(),
            text: "",
            image: uploadedFileString,
            user: {
              _id: auth?.currentUser?.email,
              name: auth?.currentUser?.displayName,
              avatar: "https://i.pravatar.cc/300",
            },
          },
        ]);
      })
      .catch((error) => {
        setUploading(false);
        console.error("Upload failed:", error);
      });
  };

  const renderBubble = useMemo(
    () => (props) =>
      (
        <Bubble
          {...props}
          wrapperStyle={{
            right: { backgroundColor: colors.primary },
            left: { backgroundColor: "lightgrey" },
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
        minInputToolbarHeight={56}
        scrollToBottom={true}
        onPressActionButton={handleEmojiPanel}
        scrollToBottomStyle={styles.scrollToBottomStyle}
        renderLoading={renderLoading}
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
