from enum import Enum


class Major(str, Enum):
    CS = "Computer Science"
    CE = "Computer Engineering"
    IT = "Information Technology"
    DS = "Data Science"
    CYBER = "Cybersecurity"
    OTHER = "Other"


class SkillLevel(str, Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    EXPERT = "Expert"


class MatchRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
