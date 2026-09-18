from app.sockets.socket_manager import (
    sio,
    connected_users,
)


class SocketService:

    @staticmethod
    async def notify(
        user_id: int,
        payload: dict,
    ):

        user = connected_users.get(user_id)

        if not user:
            return

        await sio.emit(
            "notification",
            payload,
            room=user["sid"],
        )