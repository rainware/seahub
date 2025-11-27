class SeaflowException(Exception):
    pass


class ResourceNotExist(SeaflowException):
    pass


class ParamDefinitionException(SeaflowException):
    def __init__(self, errors=None):
        self.errors = errors


class RevokeException(SeaflowException):
    pass


class TimeoutException(SeaflowException):
    pass


class ExternalActionFailed(SeaflowException):
    pass
