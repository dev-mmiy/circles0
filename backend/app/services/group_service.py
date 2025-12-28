"""
Group service for business logic related to group chat.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.group import Group, GroupMember, GroupMessage, GroupMessageRead
from app.models.user import User
from app.schemas.group import GroupCreate, GroupMessageCreate, GroupUpdate
from app.services.notification_broadcaster import broadcaster


class GroupService:
    """Service for group-related operations."""

    @staticmethod
    def create_group(
        db: Session, creator_id: UUID, group_data: GroupCreate
    ) -> Group:
        """
        Create a new group.

        Args:
            db: Database session
            creator_id: ID of the user creating the group
            group_data: Group creation data

        Returns:
            Created Group object

        Raises:
            ValueError: If any member ID is invalid
        """
        # Create group
        group = Group(
            name=group_data.name,
            description=group_data.description,
            creator_id=creator_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(group)
        db.commit()
        db.refresh(group)

        # Add creator as admin member
        creator_member = GroupMember(
            group_id=group.id,
            user_id=creator_id,
            is_admin=True,
            joined_at=datetime.utcnow(),
        )
        db.add(creator_member)

        # Add other members
        for member_id in group_data.member_ids:
            # Verify user exists
            user = db.query(User).filter(User.id == member_id).first()
            if not user:
                raise ValueError(f"User {member_id} not found")

            # Check if already added (shouldn't happen, but just in case)
            existing = (
                db.query(GroupMember)
                .filter(
                    GroupMember.group_id == group.id,
                    GroupMember.user_id == member_id,
                )
                .first()
            )
            if existing:
                continue

            member = GroupMember(
                group_id=group.id,
                user_id=member_id,
                is_admin=False,
                joined_at=datetime.utcnow(),
            )
            db.add(member)

        db.commit()
        db.refresh(group)

        return group

    @staticmethod
    def get_groups(
        db: Session,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Group]:
        """
        Get all groups for a user.

        Args:
            db: Database session
            user_id: User ID
            skip: Number of groups to skip
            limit: Maximum number of groups to return

        Returns:
            List of groups
        """
        # Get groups where user is a member and hasn't left
        query = (
            db.query(Group)
            .join(GroupMember)
            .options(
                joinedload(Group.creator),
                joinedload(Group.members).joinedload(GroupMember.user),
            )
            .filter(
                GroupMember.user_id == user_id,
                GroupMember.left_at.is_(None),
                Group.is_deleted == False,
            )
            .order_by(desc(Group.last_message_at))
            .offset(skip)
            .limit(limit)
        )

        groups = query.all()

        # Load last message for each group
        # Note: This creates N+1 queries (one per group)
        # For better performance with many groups, consider using a window function
        # similar to get_conversations in MessageService
        for group in groups:
            last_message = (
                db.query(GroupMessage)
                .options(joinedload(GroupMessage.sender))  # Eagerly load sender to avoid additional query
                .filter(
                    GroupMessage.group_id == group.id,
                    GroupMessage.is_deleted == False,
                )
                .order_by(desc(GroupMessage.created_at))
                .first()
            )
            if last_message:
                group.messages = [last_message]

        return groups

    @staticmethod
    def count_groups(
        db: Session,
        user_id: UUID,
    ) -> int:
        """
        Count total groups for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Total number of groups
        """
        count = (
            db.query(func.count(Group.id))
            .join(GroupMember)
            .filter(
                GroupMember.user_id == user_id,
                GroupMember.left_at.is_(None),
                Group.is_deleted == False,
            )
            .scalar()
        )
        return count or 0

    @staticmethod
    def search_groups(
        db: Session,
        query: str,
        skip: int = 0,
        limit: int = 20,
    ) -> List[Group]:
        """
        Search groups by name or description.

        Args:
            db: Database session
            query: Search query string
            skip: Number of groups to skip
            limit: Maximum number of groups to return

        Returns:
            List of matching groups
        """
        search_query = f"%{query}%"
        
        groups = (
            db.query(Group)
            .options(
                joinedload(Group.creator),
                joinedload(Group.members).joinedload(GroupMember.user),
            )
            .filter(
                or_(
                    Group.name.ilike(search_query),
                    Group.description.ilike(search_query),
                ),
                Group.is_deleted == False,
            )
            .order_by(desc(Group.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

        return groups

    @staticmethod
    def count_search_groups(
        db: Session,
        query: str,
    ) -> int:
        """
        Count total groups matching search query.

        Args:
            db: Database session
            query: Search query string

        Returns:
            Total number of matching groups
        """
        search_query = f"%{query}%"
        count = (
            db.query(func.count(Group.id))
            .filter(
                or_(
                    Group.name.ilike(search_query),
                    Group.description.ilike(search_query),
                ),
                Group.is_deleted == False,
            )
            .scalar()
        )
        return count or 0

    @staticmethod
    def get_group_by_id(
        db: Session, group_id: UUID, user_id: UUID
    ) -> Optional[Group]:
        """
        Get a group by ID.

        Args:
            db: Database session
            group_id: Group ID
            user_id: User ID (must be a member)

        Returns:
            Group object or None if not found or user is not a member
        """
        # Check if user is a member
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            return None

        # Get group
        group = (
            db.query(Group)
            .options(
                joinedload(Group.creator),
                joinedload(Group.members).joinedload(GroupMember.user),
            )
            .filter(Group.id == group_id, Group.is_deleted == False)
            .first()
        )

        return group

    @staticmethod
    def update_group(
        db: Session, group_id: UUID, user_id: UUID, group_data: GroupUpdate
    ) -> Optional[Group]:
        """
        Update a group.

        Args:
            db: Database session
            group_id: Group ID
            user_id: User ID (must be admin)
            group_data: Group update data

        Returns:
            Updated Group object or None if not found or user is not admin
        """
        # Check if user is admin
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
                GroupMember.is_admin == True,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            return None

        # Get group
        group = (
            db.query(Group)
            .filter(Group.id == group_id, Group.is_deleted == False)
            .first()
        )

        if not group:
            return None

        # Update fields
        if group_data.name is not None:
            group.name = group_data.name
        if group_data.description is not None:
            group.description = group_data.description
        if group_data.avatar_url is not None:
            group.avatar_url = group_data.avatar_url

        group.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(group)

        return group

    @staticmethod
    def delete_group(db: Session, group_id: UUID, user_id: UUID) -> bool:
        """
        Delete a group (soft delete).

        Args:
            db: Database session
            group_id: Group ID
            user_id: User ID (must be creator or admin)

        Returns:
            True if deleted, False if not found or user is not authorized
        """
        # Check if user is creator or admin
        group = (
            db.query(Group)
            .filter(Group.id == group_id, Group.is_deleted == False)
            .first()
        )

        if not group:
            return False

        # Check if user is creator
        if group.creator_id == user_id:
            group.is_deleted = True
            group.updated_at = datetime.utcnow()
            db.commit()
            return True

        # Check if user is admin
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
                GroupMember.is_admin == True,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            return False

        group.is_deleted = True
        group.updated_at = datetime.utcnow()
        db.commit()

        return True

    @staticmethod
    def add_members(
        db: Session, group_id: UUID, admin_id: UUID, user_ids: List[UUID]
    ) -> List[GroupMember]:
        """
        Add members to a group.

        Args:
            db: Database session
            group_id: Group ID
            admin_id: ID of the admin adding members
            user_ids: List of user IDs to add

        Returns:
            List of created GroupMember objects

        Raises:
            ValueError: If user is not admin or any user ID is invalid
        """
        # Check if user is admin
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == admin_id,
                GroupMember.is_admin == True,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            raise ValueError("User is not an admin of this group")

        # Verify group exists
        group = (
            db.query(Group)
            .filter(Group.id == group_id, Group.is_deleted == False)
            .first()
        )
        if not group:
            raise ValueError("Group not found")

        # Add members
        added_members = []
        for user_id in user_ids:
            # Verify user exists
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User {user_id} not found")

            # Check if already a member
            existing = (
                db.query(GroupMember)
                .filter(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id,
                )
                .first()
            )

            if existing:
                # If left, rejoin
                if existing.left_at is not None:
                    existing.left_at = None
                    existing.joined_at = datetime.utcnow()
                    db.commit()
                    added_members.append(existing)
                continue

            member = GroupMember(
                group_id=group_id,
                user_id=user_id,
                is_admin=False,
                joined_at=datetime.utcnow(),
            )
            db.add(member)
            added_members.append(member)

        db.commit()

        return added_members

    @staticmethod
    def remove_member(
        db: Session, group_id: UUID, admin_id: UUID, user_id: UUID
    ) -> bool:
        """
        Remove a member from a group.

        Args:
            db: Database session
            group_id: Group ID
            admin_id: ID of the admin removing the member
            user_id: ID of the user to remove

        Returns:
            True if removed, False if not found or user is not admin

        Raises:
            ValueError: If trying to remove the last admin
        """
        # Check if user is admin
        admin_membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == admin_id,
                GroupMember.is_admin == True,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not admin_membership:
            return False

        # Get member to remove
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            return False

        # Check if trying to remove the last admin
        if membership.is_admin:
            admin_count = (
                db.query(GroupMember)
                .filter(
                    GroupMember.group_id == group_id,
                    GroupMember.is_admin == True,
                    GroupMember.left_at.is_(None),
                )
                .count()
            )
            if admin_count <= 1:
                raise ValueError("Cannot remove the last admin")

        # Mark as left
        membership.left_at = datetime.utcnow()
        db.commit()

        return True

    @staticmethod
    def update_member_role(
        db: Session, group_id: UUID, admin_id: UUID, user_id: UUID, is_admin: bool
    ) -> Optional[GroupMember]:
        """
        Update a member's role.

        Args:
            db: Database session
            group_id: Group ID
            admin_id: ID of the admin updating the role
            user_id: ID of the user whose role is being updated
            is_admin: Whether user should be an admin

        Returns:
            Updated GroupMember object or None if not found or user is not admin

        Raises:
            ValueError: If trying to remove admin status from the last admin
        """
        # Check if user is admin
        admin_membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == admin_id,
                GroupMember.is_admin == True,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not admin_membership:
            return None

        # Get member to update
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            return None

        # Check if trying to remove admin status from the last admin
        if membership.is_admin and not is_admin:
            admin_count = (
                db.query(GroupMember)
                .filter(
                    GroupMember.group_id == group_id,
                    GroupMember.is_admin == True,
                    GroupMember.left_at.is_(None),
                )
                .count()
            )
            if admin_count <= 1:
                raise ValueError("Cannot remove admin status from the last admin")

        membership.is_admin = is_admin
        db.commit()
        db.refresh(membership)

        return membership

    @staticmethod
    def send_group_message(
        db: Session, sender_id: UUID, group_id: UUID, message_data: GroupMessageCreate
    ) -> GroupMessage:
        """
        Send a message to a group.

        Args:
            db: Database session
            sender_id: ID of the user sending the message
            group_id: Group ID
            message_data: Message data

        Returns:
            Created GroupMessage object

        Raises:
            ValueError: If user is not a member of the group
        """
        # Check if user is a member
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == sender_id,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            raise ValueError("User is not a member of this group")

        # Verify group exists
        group = (
            db.query(Group)
            .filter(Group.id == group_id, Group.is_deleted == False)
            .first()
        )
        if not group:
            raise ValueError("Group not found")

        # Create message
        message = GroupMessage(
            group_id=group_id,
            sender_id=sender_id,
            content=message_data.content,
            image_url=message_data.image_url,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(message)
        db.commit()

        # Update group's last_message_at
        group.last_message_at = datetime.utcnow()
        group.updated_at = datetime.utcnow()
        db.commit()

        return message

    @staticmethod
    async def broadcast_group_message_async(message: GroupMessage, group_id: UUID):
        """
        Broadcast a group message to real-time SSE connections.
        
        This is a wrapper for BackgroundTasks that handles the async broadcast.
        
        Args:
            message: The message object to broadcast (should have sender loaded)
            group_id: Group ID
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            await GroupService._broadcast_group_message(message, group_id)
        except Exception as e:
            logger.error(
                f"Failed to broadcast group message {message.id} to group {group_id}: {e}",
                exc_info=True
            )

    @staticmethod
    async def _broadcast_group_message(message: GroupMessage, group_id: UUID):
        """
        Broadcast a group message to real-time SSE connections.

        Args:
            message: The message object to broadcast (should have sender loaded)
            group_id: Group ID
        """
        # Format sender data
        sender_data = None
        if message.sender:
            sender_data = {
                "id": str(message.sender.id),
                "nickname": message.sender.nickname,
                "username": message.sender.username,
                "avatar_url": message.sender.avatar_url,
            }

        # Format message data for SSE
        message_data = {
            "id": str(message.id),
            "group_id": str(message.group_id),
            "sender_id": str(message.sender_id),
            "content": message.content,
            "image_url": message.image_url,
            "is_deleted": message.is_deleted,
            "created_at": message.created_at.isoformat(),
            "updated_at": message.updated_at.isoformat(),
            "sender": sender_data,
        }

        # Get all group members
        from app.database import SessionLocal
        import logging

        logger = logging.getLogger(__name__)
        db = SessionLocal()
        try:
            members = (
                db.query(GroupMember)
                .filter(
                    GroupMember.group_id == group_id,
                    GroupMember.left_at.is_(None),
                )
                .all()
            )

            logger.info(
                f"Broadcasting group message {message.id} to {len(members)} members in group {group_id}"
            )

            # Broadcast to all members
            broadcast_count = 0
            for member in members:
                try:
                    await broadcaster.broadcast_to_user(
                        member.user_id, "group_message", message_data
                    )
                    broadcast_count += 1
                except Exception as e:
                    logger.error(
                        f"Failed to broadcast to user {member.user_id}: {e}",
                        exc_info=True
                    )

            logger.info(
                f"Successfully broadcasted group message {message.id} to {broadcast_count}/{len(members)} members"
            )
        except Exception as e:
            logger.error(
                f"Error broadcasting group message {message.id}: {e}",
                exc_info=True
            )
        finally:
            db.close()

    @staticmethod
    def get_group_messages(
        db: Session,
        group_id: UUID,
        user_id: UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> List[GroupMessage]:
        """
        Get messages in a group.

        Args:
            db: Database session
            group_id: Group ID
            user_id: User ID (must be a member)
            skip: Number of messages to skip
            limit: Maximum number of messages to return

        Returns:
            List of messages
        """
        # Verify user is a member
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            return []

        # Get messages
        messages = (
            db.query(GroupMessage)
            .options(
                joinedload(GroupMessage.sender), joinedload(GroupMessage.reads)
            )
            .filter(
                GroupMessage.group_id == group_id,
                GroupMessage.is_deleted == False,
            )
            .order_by(desc(GroupMessage.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

        # Reverse to show oldest first
        messages.reverse()

        return messages

    @staticmethod
    def count_group_messages(
        db: Session,
        group_id: UUID,
        user_id: UUID,
    ) -> int:
        """
        Count total messages in a group.

        Args:
            db: Database session
            group_id: Group ID
            user_id: User ID (must be a member)

        Returns:
            Total number of messages
        """
        # Verify user is a member
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            return 0

        count = (
            db.query(func.count(GroupMessage.id))
            .filter(
                GroupMessage.group_id == group_id,
                GroupMessage.is_deleted == False,
            )
            .scalar()
        )
        return count or 0

    @staticmethod
    def mark_group_messages_as_read(
        db: Session,
        group_id: UUID,
        reader_id: UUID,
        message_ids: Optional[List[UUID]] = None,
    ) -> int:
        """
        Mark group messages as read.

        Args:
            db: Database session
            group_id: Group ID
            reader_id: ID of the user marking messages as read
            message_ids: Specific message IDs to mark as read. If None, marks all unread messages.

        Returns:
            Number of messages marked as read
        """
        # Verify user is a member
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == reader_id,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            return 0

        # Get messages to mark as read
        if message_ids:
            # Mark specific messages
            query = db.query(GroupMessage).filter(
                GroupMessage.group_id == group_id,
                GroupMessage.id.in_(message_ids),
                GroupMessage.sender_id != reader_id,  # Don't mark own messages as read
                GroupMessage.is_deleted == False,
            )
        else:
            # Mark all unread messages in group
            query = db.query(GroupMessage).filter(
                GroupMessage.group_id == group_id,
                GroupMessage.sender_id != reader_id,  # Don't mark own messages as read
                GroupMessage.is_deleted == False,
            )

        messages = query.all()

        # Filter out already read messages
        already_read_message_ids = {
            mr.message_id
            for mr in db.query(GroupMessageRead)
            .filter(
                GroupMessageRead.reader_id == reader_id,
                GroupMessageRead.message_id.in_([m.id for m in messages]),
            )
            .all()
        }

        messages_to_mark = [m for m in messages if m.id not in already_read_message_ids]

        # Create GroupMessageRead records
        marked_count = 0
        for message in messages_to_mark:
            message_read = GroupMessageRead(
                message_id=message.id,
                reader_id=reader_id,
                read_at=datetime.utcnow(),
            )
            db.add(message_read)
            marked_count += 1

        db.commit()

        return marked_count

    @staticmethod
    def delete_group_message(
        db: Session, message_id: UUID, user_id: UUID
    ) -> bool:
        """
        Delete a group message (soft delete).

        Args:
            db: Database session
            message_id: Message ID
            user_id: User ID (must be the sender or an admin)

        Returns:
            True if deleted, False if not found or user is not authorized
        """
        message = (
            db.query(GroupMessage)
            .filter(GroupMessage.id == message_id)
            .first()
        )

        if not message:
            return False

        # Check if user is sender
        if message.sender_id == user_id:
            message.is_deleted = True
            message.updated_at = datetime.utcnow()
            db.commit()
            return True

        # Check if user is admin
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == message.group_id,
                GroupMember.user_id == user_id,
                GroupMember.is_admin == True,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            return False

        message.is_deleted = True
        message.updated_at = datetime.utcnow()
        db.commit()

        return True

    @staticmethod
    def get_unread_count(db: Session, group_id: UUID, user_id: UUID) -> int:
        """
        Get unread message count for a group.

        Args:
            db: Database session
            group_id: Group ID
            user_id: User ID

        Returns:
            Number of unread messages
        """
        # Verify user is a member
        membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id,
                GroupMember.left_at.is_(None),
            )
            .first()
        )

        if not membership:
            return 0

        # Get all messages in group that are not from the user
        all_message_ids = [
            m.id
            for m in db.query(GroupMessage)
            .filter(
                GroupMessage.group_id == group_id,
                GroupMessage.sender_id != user_id,
                GroupMessage.is_deleted == False,
            )
            .all()
        ]

        if not all_message_ids:
            return 0

        # Get read message IDs
        read_message_ids = {
            mr.message_id
            for mr in db.query(GroupMessageRead)
            .filter(
                GroupMessageRead.reader_id == user_id,
                GroupMessageRead.message_id.in_(all_message_ids),
            )
            .all()
        }

        return len(all_message_ids) - len(read_message_ids)


