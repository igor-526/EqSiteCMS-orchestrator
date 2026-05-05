"""Domain-level exceptions."""


class DomainException(Exception):
    """Base domain exception."""

    def __init__(self, message: str, code: str | None = None):
        self.message = message
        self.code = code
        super().__init__(message)


class DuplicateRequestError(DomainException):
    """Exception raised when attempting to create a duplicate request."""

    def __init__(self, request_id: str, message: str | None = None):
        self.request_id = request_id
        message = message or f"Request with ID {request_id} already exists"
        super().__init__(message=message, code="DUPLICATE_REQUEST")


class RequestNotFoundError(DomainException):
    """Exception raised when a request is not found."""

    def __init__(self, request_id: str, message: str | None = None):
        self.request_id = request_id
        message = message or f"Request with ID {request_id} not found"
        super().__init__(message=message, code="REQUEST_NOT_FOUND")
