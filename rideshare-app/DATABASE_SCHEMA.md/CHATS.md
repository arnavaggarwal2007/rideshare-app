This stores all conversations between drivers and riders
Fields:
- chatId (unique identifier)
- type (trip-group or direct message)
- rideId (which ride this chat is about)
- participants (array of user IDs involved)
- messages (array of message objects with sender, text, timestamp)
- lastMessage (most recent message reference)
- lastUpdated (timestamp of most recent activity)
