def normalize_set(items: list[str]) -> set[str]:
    return {item.strip().lower() for item in items}


def jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    return len(a & b) / len(a | b)


def compute_match_score(user_a: dict, user_b: dict) -> float:
    skills_a = normalize_set(user_a.get("skills", []))
    skills_b = normalize_set(user_b.get("skills", []))

    skills_score = jaccard(skills_a, skills_b)

    major_bonus = 0.1 if user_a.get("major") == user_b.get("major") else 0.0

    return 0.9 * skills_score + major_bonus


def get_suggestions(
    current_user: dict, candidates: list[dict], limit: int = 10
) -> list[tuple[dict, float]]:
    scored = [
        (candidate, compute_match_score(current_user, candidate))
        for candidate in candidates
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:limit]
